// Hero 入り込み演出。
//
// timeline 構成（time, duration の単位は timeline 内の相対時間）:
//   ロゴ退場    (0.0, 0.4)  .hero__logo / .hero__tagline   autoAlpha 1→0
//   art 中央寄せ (0.0, 0.4)  .hero__art                     y → 中央計算値 / scale 1→1.15
//   L1 左拡大   (0.4, 0.69) L1 1番目                       scale 14.4 / blur 24px / xPercent -130 / autoAlpha 0 / yPercent -96
//   L1 右拡大   (0.4, 0.69) L1 2番目                       scale 14.4 / blur 24px / xPercent +130 / autoAlpha 0 / yPercent -96
//   L2 拡大     (0.4, 0.72) L2                             scale 1→2.6 / blur 8px / transformOrigin 50% 65%
//   L2 フェード (1.26, 0.34) L2                            scale 2.6→3.2 / autoAlpha 1→0
//
// pin 長 2960px。scrub:1 で滑らかに追従。
// refreshPriority: 230（最高位・後続セクション pin spacer 連鎖の起点）。

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
      const heroTagline = document.querySelector<HTMLElement>('.hero__tagline');
      const heroDecor = document.querySelector<HTMLElement>('.hero__decor');
      const heroGlowWrap = document.querySelector<HTMLElement>('.hero__glow-wrap');
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

      // L1 内 picture 順序: 1番目=左端、2番目=右端（Hero.astro DOM 順）
      const leftL1 = l1Pictures[0];
      const rightL1 = l1Pictures[1];

      // heroArt を「画面中央より少し上」に持っていく y シフト量を計算。
      // 目標 y = window.innerHeight * 0.38（viewport 縦 38% 位置 = 中央 50% より約 -12%）。
      // heroArt の現在中心 y との差を返す。Math.min で必ず -40px 以上の上移動を保証する
      // （heroArt が既に中央付近にある場合に正値に転んで下方向に動く事故を防止）。
      // invalidateOnRefresh:true で fonts/images ロード後・リサイズ後も再計算する。
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

      // ── ロゴ + tagline + 周囲装飾 + 楕円光 退場 + イラスト中央寄せ + 少しズーム ──
      // tagline / decor / glow-wrap はロゴと同タイミング・同 duration でフェードアウトさせる。
      // decor は wrapper（opacity 常時 1）/ glow は glow-wrap（同）を対象にし、
      // heroIntro が触る個別 item / 内側 glow の opacity と分離して visibility 競合を避ける。
      const stage0aTargets: HTMLElement[] = [heroLogo];
      if (heroTagline) stage0aTargets.push(heroTagline);
      if (heroDecor) stage0aTargets.push(heroDecor);
      if (heroGlowWrap) stage0aTargets.push(heroGlowWrap);
      tl.to(stage0aTargets, { autoAlpha: 0, ease: 'power1.in', duration: 0.8 }, 0);
      tl.to(
        heroArt,
        { y: () => getArtCenterShift(), scale: 1.15, ease: 'power2.out', duration: 0.4 },
        0
      );

      // ── 同位置 0.4 開始・L1 速い / L2 ゆっくり ──
      // L1 は 3 tween に分離して別速度で進める:
      //   - scale (max 14.4) は短め duration で「大きくなる」演出を強く出す。
      //   - blur (24px) は scale より少し遅らせて視認性を残す。
      //   - 外側移動 (xPercent ±130 + autoAlpha + yPercent -96) は長め duration で
      //     横にゆっくり消えていく印象を作る。
      // L2 は scale と blur を別 tween に分離（blur tween のほうが時間長め）。
      // 左の L1
      tl.to(leftL1, { scale: 14.4, ease: 'power2.in', duration: 0.69 }, 0.4);
      tl.to(leftL1, { filter: 'blur(24px)', ease: 'power2.in', duration: 0.531 }, 0.4);
      tl.to(
        leftL1,
        { xPercent: -130, autoAlpha: 0, ease: 'power2.in', duration: 1.38 },
        0.4
      );
      // 上方向移動（横移動より長めの duration でゆっくり持ち上げる）
      tl.to(leftL1, { yPercent: -96, ease: 'power2.in', duration: 1.97 }, 0.4);
      // 右の L1
      tl.to(rightL1, { scale: 14.4, ease: 'power2.in', duration: 0.69 }, 0.4);
      tl.to(rightL1, { filter: 'blur(24px)', ease: 'power2.in', duration: 0.531 }, 0.4);
      tl.to(
        rightL1,
        { xPercent: 130, autoAlpha: 0, ease: 'power2.in', duration: 1.38 },
        0.4
      );
      tl.to(rightL1, { yPercent: -96, ease: 'power2.in', duration: 1.97 }, 0.4);
      // L2（scale と blur を別 tween に分離）
      tl.to(
        l2,
        { scale: 2.6, transformOrigin: '50% 65%', ease: 'power2.inOut', duration: 0.72 },
        0.4
      );
      tl.to(
        l2,
        { filter: 'blur(8px)', ease: 'power2.inOut', duration: 1.72 },
        0.4
      );

      // ── L2 フェード ──
      tl.to(
        l2,
        { scale: 3.2, autoAlpha: 0, ease: 'power1.in', duration: 0.34 },
        1.26
      );

      // cleanup: matchMedia revert 時に Hero 系を初期状態に戻す（保険）。
      return () => {
        gsap.set('.hero__layer--l1, .hero__layer--l2', { willChange: 'auto' });
        gsap.set('.hero__logo', { autoAlpha: 1 });
        if (heroTagline) gsap.set('.hero__tagline', { autoAlpha: 1 });
        gsap.set('.hero__decor, .hero__glow-wrap', { autoAlpha: 1 });
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
