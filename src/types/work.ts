// 作品紹介ページ 共通型定義。

export interface WorkPin {
  id: string;
  label: string;
  x_pct: number; // 0-100
  y_pct: number; // 0-100
  title: string;
  body: string;
  screenshot: string; // /works/{slug}/xxx.png
}

export interface WorkHotspot {
  image: string;
  image_alt: string;
  pins: WorkPin[];
}

export type WorkDownloadOS = 'windows' | 'macos' | 'linux' | 'source';
export type WorkDownloadArch = 'x64' | 'arm64' | null;

export interface WorkDownload {
  os: WorkDownloadOS;
  arch: WorkDownloadArch;
  url: string;
  size_mb: number | null;
  label: string;
}

export interface WorkDistribution {
  enabled: boolean;
  version: string | null;
  released_at: string | null;
  downloads: WorkDownload[];
  install_guide: string;
  release_notes_url: string | null;
}

export interface WorkTeamMember {
  name: string;
  role: string;
}

export interface WorkMeta {
  period: string;
  duration_label: string;
  stack: string[];
  team: WorkTeamMember[];
  development_style: string;
}

export interface WorkLink {
  label: string;
  url: string;
}

export interface Work {
  slug: string;
  title: string;
  subtitle: string;
  tagline: string;
  hero_image: string;

  what: string[];
  why: string[];

  hotspot?: WorkHotspot;
  meta: WorkMeta;
  distribution?: WorkDistribution;
  links?: WorkLink[];
}
