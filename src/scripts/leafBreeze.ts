// F4-e ちらほら装飾「葉っぱそよ風アニメ」JS 駆動（設計書 §5.8 / あめさん FB 2026-06-21）。
//
// シンプル化リライト（2026-06-21 第3弾）:
//   - 横断 modifiers の sin 摂動が動かない症状の真因切り分けのため、
//     modifiers を完全廃止。確実に動く「素の gsap.to」3 本で構成する。
//   - HMR / 多重 import で setup() が複数回走っても tween が重複しないよう、
//     forEach 内の冒頭で各葉に対し `gsap.killTweensOf(leaf)` を呼ぶ。
//     これで「最後に走った setup() の 1 セットだけが生き残る」状態を保証。
//   - idempotent ガード（window.__leafBreezeInit__）は無害なので残置。
//
// 構成（葉ごとに 3 tween）:
//   (1) 横断: x を線形で右へ。onRepeat で左端 + ランダム y に再投入。
//   (2) 上下浮遊: y を yoyo（風で持ち上がる感）。
//   (3) 回転: rotation を yoyo（葉が風で揺れる感）。
//   → sin 摂動なしでも yoyo y + yoyo rotation の組合せで自然なそよ風感が出る。
//
// 視差・出現演出との非干渉:
//   - parallax.ts (`[data-parallax]`) と属性が別なので DOM 競合なし。
//   - heroImmersion.ts / bgGradient.ts / coffeeStain.ts は別レイヤ・別 transform 経路。
//
// reduce 時:
//   - matchMedia('(prefers-reduced-motion: reduce)') ならスクリプトを起動しない。
//   - 葉は LeafBreeze.astro の初期 inline transform で静止表示される。

import gsap from 'gsap';

declare global {
  interface Window {
    __leafBreezeInit__?: boolean;
  }
}

function setup() {
  // idempotent ガード（HMR / 多重 import 対策・無害な保険）
  if (window.__leafBreezeInit__) return;
  window.__leafBreezeInit__ = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return; // reduce 時はアニメ起動せず・葉は静止表示

  const leaves = document.querySelectorAll<HTMLElement>('[data-leaf]');
  if (!leaves.length) return;

  leaves.forEach((leaf) => {
    // 多重 setup 対策: 既存 tween を全 kill してから新規登録
    gsap.killTweensOf(leaf);

    const speedSec = Number(leaf.dataset.speedSec ?? '40');
    const delaySec = Number(leaf.dataset.delaySec ?? '0');

    const travel = window.innerWidth + 200;

    // (1) 横断: シンプルな等速・modifiers 廃止
    gsap.to(leaf, {
      x: '+=' + travel,
      duration: speedSec,
      ease: 'none',
      repeat: -1,
      delay: delaySec,
      onRepeat: () => {
        // ループ毎に左端 + ランダム y へ再投入（端から流れ続ける感）。
        gsap.set(leaf, {
          x: -80,
          y: gsap.utils.random(-window.innerHeight * 0.05, window.innerHeight * 0.95),
        });
      },
    });

    // (2) 上下のゆっくり浮遊（yoyo・風で持ち上がる感）
    gsap.to(leaf, {
      y: '+=' + gsap.utils.random(40, 80),
      duration: gsap.utils.random(6, 10),
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: gsap.utils.random(0, 4),
    });

    // (3) 回転 yoyo（くるくる回るのではなく葉が風で揺れる感）
    gsap.to(leaf, {
      rotation: '+=' + gsap.utils.random(-60, 60),
      duration: gsap.utils.random(5, 9),
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: gsap.utils.random(0, 3),
    });
  });
}

// 起動分岐:
//   - module 実行時に readyState が 'complete' なら即 setup
//   - 'interactive' なら 'load' を待つ（fonts/images で section 位置が動く前提を踏襲）
//   - 'loading' なら DOMContentLoaded を経由してから同じ判定
function trigger() {
  if (document.readyState === 'complete') {
    setup();
  } else {
    window.addEventListener('load', setup, { once: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', trigger, { once: true });
} else {
  trigger();
}
