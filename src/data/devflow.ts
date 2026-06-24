import type { DevFlowStep } from './devflow.types';

// What: 開発フロー 6 ステップの表示データ。モーダル内には画像 1 枚のみ。

export const devflowSteps: DevFlowStep[] = [
  {
    id: 'requirements',
    no: '01',
    title: '要件定義',
    who: 'あめまみれ × さき (CEO)',
    body: '何を作るかを壁打ちで固める。必要なら下調べを挟む。',
    image: '/devflow/requirements.png',
  },
  {
    id: 'design',
    no: '02',
    title: '設計書',
    who: 'ろぴ (CTO)',
    body: '仕様を実装できる粒度の設計に落とす。フェーズ分けもここで。',
    image: '/devflow/design.png',
  },
  {
    id: 'implementation',
    no: '03',
    title: '実装 + 一次テスト',
    who: 'みつる (Developer)',
    body: 'まず動くものを作り、自分で動作確認まで通す。',
    image: '/devflow/implementation.png',
  },
  {
    id: 'second-test',
    no: '04',
    title: '二次テスト',
    who: 'ろぴ (CTO)',
    body: '設計書とコードを照合し、コードレビューと動作確認をする。',
    image: '/devflow/second-test.png',
  },
  {
    id: 'verification',
    no: '05',
    title: '実機検証',
    who: 'さき (CEO) → あめまみれ',
    body: '実機で最終確認。問題があれば前の段に差し戻す。',
    image: '/devflow/verification.png',
  },
  {
    id: 'deploy',
    no: '06',
    title: 'デプロイ',
    who: 'さき (CEO) → CI/CD',
    body: '承認済みのコードを本番環境に届けるところまで通す。',
    image: '/devflow/deploy.png',
  },
];
