// 演出A Hero 入り込み（rev1 base + あめさん FB 数値温存・案 B rev2 巻き戻し）
// 設計書: docs/designs/hp_v2_演出A_rev2_hero_studioabout_unified_2026-06-19.md
//          ※ rev2 で行った StudioAbout 統合（pin 内 fixed overlay）は構造的負債のため撤去。
//             Hero pin 区間内の段階0〜2（heroLogo / heroArt / L1 / L2）のみ残す。
//
// 段階配分:
//   0a (0.0, dur 0.4)  .hero__logo  autoAlpha 1→0
//   0b (0.0, dur 0.4)  .hero__art    y → 中央計算値 / scale 1→1.15
//   1a (0.4, dur 0.69) L1 ともみ     scale 9.6 / blur 24px / xPercent -130 / autoAlpha 0 / yPercent -96
//   1b (0.4, dur 0.69) L1 ろぴ       scale 9.6 / blur 24px / xPercent +130 / autoAlpha 0 / yPercent -96
//   1c (0.4, dur 0.86) L2            scale 1→2.6 / blur 8px / transformOrigin 50% 65%
//   2  (1.26, dur 0.34) L2           scale 2.6→3.2 / autoAlpha 1→0
//
// pin 長 2960px（rev1 比率維持・中速感）。scrub:1 で滑らかに追従。
// refreshPriority: 230 維持（最高位・後続セクション pin spacer 連鎖の起点）。

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HERO_PIN_PX = 2960;

function setup() {
  const mm = gsap.matchMedia();

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const conds = context.conditions!;

      const hero = document.querySelector<HTMLElement>('.hero');
      const heroLogo = document.querySelector<HTMLElement>('.hero__logo');
      const heroArt = document.querySelector<HTMLElement>('.hero__art');
      const l1Pictures = document.querySelectorAll<HTMLElement>('.hero__layer--l1 > picture');
      const l2 = document.querySelector<HTMLElement>('.hero__layer--l2');

      if (conds.reduce) {
        // 静的版: アニメ一切なし。CSS の初期値で全表示。
        gsap.set('.hero__layer--l1, .hero__layer--l2, .hero__logo', { clearProps: 'all' });
        gsap.set('.hero__art', { clearProps: 'all' });
        return;
      }
      if (!conds.motion) return;

      if (!hero || !heroLogo || !heroArt || l1Pictures.length < 2 || !l2) return;

      // L1 内 picture 順序: 1番目=ともみ（左端）、2番目=ろぴ（右端）（Hero.astro DOM 順）
      const tomomi = l1Pictures[0];
      const ropi = l1Pictures[1];

      // rev2 §3.1 [あめさん FB 1 反映]: heroArt を「画面中央より少し上」に持っていく y シフト量。
      // - 目標 y = window.innerHeight * 0.38（viewport 縦 38% 位置 = 中央 50% より約 -12%）。
      // - heroArt の現在中心 y との差を返す。上方向に動かしたいので必ず**負値**で返す。
      // - 初回 FB「ワンスクロールでイラストが画面下に飛んでいく」の原因: 旧 viewportCenterY - artCenterY
      //   は heroArt が既に viewport 中央付近（margin-top:-5rem で少し上）にいるため正値 or 0 になり、
      //   結果として下に動いていた。今回は目標を意図的に「中央より上」に固定 + 上方向保証で再発防止。
      // - 最低でも -40px の上移動を Math.min で保証（小さい viewport で正値に転ぶ事故防止）。
      // - invalidateOnRefresh:true で fonts/images ロード後・リサイズ後も再計算。
      const getArtCenterShift = (): number => {
        const rect = heroArt.getBoundingClientRect();
        const artCenterY = rect.top + rect.height / 2;
        const targetY = window.innerHeight * 0.38; // 中央より少し上
        const shift = targetY - artCenterY;
        return Math.min(shift, -40); // 必ず上方向 (負値) へ・最低 40px
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: `+=${HERO_PIN_PX}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: 230,
        },
      });

      // ── 段階0: ロゴ退場 + イラスト中央寄せ + 少しズーム ──
      tl.to(heroLogo, { autoAlpha: 0, ease: 'power1.in', duration: 0.4 }, 0);
      tl.to(
        heroArt,
        { y: () => getArtCenterShift(), scale: 1.15, ease: 'power2.out', duration: 0.4 },
        0
      );

      // ── 段階1: 同位置 0.4 開始・L1 速い / L2 ゆっくり ──
      // あめさん FB 2 rev2 + あめさん追加要望 (2026-06-20):
      //   L1 は 3 tween に分離。
      //     - scale: duration 0.345（max 9.6）→「大きくなる」演出を 2 倍速で。
      //     - blur:  duration 0.531（= 0.69 / 1.3）→ blur のかかり方を 1.3 倍速に。
      //     - 外側移動 (xPercent ±130 / autoAlpha): duration 1.38（= 0.69 × 2）→ 0.5 倍速で
      //       横にゆっくり消えていく印象を強める。
      //   L2 は blur だけ遅く分離（duration 1.72 = 元 0.86 の 2 倍時間 = 0.5 倍速）、
      //   scale 1→2.6（duration 0.86）は据え置き。transformOrigin は scale tween に付ける。
      // 段階1a: ともみ
      tl.to(tomomi, { scale: 9.6, ease: 'power2.in', duration: 0.69 }, 0.4);
      tl.to(tomomi, { filter: 'blur(24px)', ease: 'power2.in', duration: 0.531 }, 0.4);
      tl.to(
        tomomi,
        { xPercent: -130, autoAlpha: 0, ease: 'power2.in', duration: 1.38 },
        0.4
      );
      // 上方向移動（横移動の 0.7 倍速 = duration 1.97）。あめさん追加要望 (2026-06-20)。
      tl.to(tomomi, { yPercent: -96, ease: 'power2.in', duration: 1.97 }, 0.4);
      // 段階1b: ろぴ
      tl.to(ropi, { scale: 9.6, ease: 'power2.in', duration: 0.69 }, 0.4);
      tl.to(ropi, { filter: 'blur(24px)', ease: 'power2.in', duration: 0.531 }, 0.4);
      tl.to(
        ropi,
        { xPercent: 130, autoAlpha: 0, ease: 'power2.in', duration: 1.38 },
        0.4
      );
      // 上方向移動（横移動の 0.7 倍速 = duration 1.97）。あめさん追加要望 (2026-06-20)。
      tl.to(ropi, { yPercent: -96, ease: 'power2.in', duration: 1.97 }, 0.4);
      // 段階1c: L2（scale と blur を別 tween に分離）
      tl.to(
        l2,
        { scale: 2.6, transformOrigin: '50% 65%', ease: 'power2.inOut', duration: 0.86 },
        0.4
      );
      tl.to(
        l2,
        { filter: 'blur(8px)', ease: 'power2.inOut', duration: 1.72 },
        0.4
      );

      // ── 段階2: L2 フェード ──
      tl.to(
        l2,
        { scale: 3.2, autoAlpha: 0, ease: 'power1.in', duration: 0.34 },
        1.26
      );

      // cleanup: matchMedia revert 時に Hero 系を初期状態に戻す（保険）。
      return () => {
        gsap.set('.hero__layer--l1, .hero__layer--l2', { willChange: 'auto' });
        gsap.set('.hero__logo', { autoAlpha: 1 });
        gsap.set('.hero__art', { y: 0, scale: 1 });
      };
    }
  );
}

// fonts/images ロード完了後に setup（pin start/end の測定対象を確定）
if (document.readyState === 'complete') {
  setup();
} else {
  window.addEventListener('load', setup, { once: true });
}
