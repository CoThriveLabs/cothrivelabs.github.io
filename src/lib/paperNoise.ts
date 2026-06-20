// 紙テクスチャ noise の共通モジュール。
// PaperBg.astro と Base.astro（シミ系）の両方からこの 1 箇所を参照し、
// 紙背景・シミ色背景・シミ overlay fill の noise 粒を完全一致させる（質感統一）。
//
// 実装方式:
//   inline SVG feTurbulence（fractalNoise）を data URI 化 → background-image で
//   160×160px タイル repeat（HTTP リクエスト 0）。feColorMatrix で turbulence の
//   アルファに alpha、色に rgb を流し込み「茶系の半透明粒（紙の繊維っぽさ）」を出す。

export interface NoiseParams {
  baseFrequency: number;
  numOctaves: number;
  seed: number;
  alpha: number;
  rgb: [number, number, number];
}

// NOISE 値（baseFrequency 0.35 / octaves 3 / seed 11 / alpha 0.14 / rgb 0.32,0.24,0.14）。
// PaperBg / シミ背景 / シミ fill の質感を統一する正本値なので、参照元ごとにズラさない。
export const NOISE: NoiseParams = {
  baseFrequency: 0.35,
  numOctaves: 3,
  seed: 11,
  alpha: 0.14,
  rgb: [0.32, 0.24, 0.14],
};

export function makeNoiseSvg({ baseFrequency, numOctaves, seed, alpha, rgb }: NoiseParams): string {
  const [r, g, b] = rgb;
  const matrix = `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 ${alpha} 0`;
  return (
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
    "<filter id='n'>" +
    `<feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='${numOctaves}' seed='${seed}'/>` +
    `<feColorMatrix values='${matrix}'/>` +
    "</filter>" +
    "<rect width='100%25' height='100%25' filter='url(%23n)'/>" +
    "</svg>"
  ).replaceAll("#", "%23");
}

// 共通の noise data URI（NOISE 定数から生成）。CSS 変数 --paper-noise-url の値に使う。
export const paperNoiseUrl: string = makeNoiseSvg(NOISE);
