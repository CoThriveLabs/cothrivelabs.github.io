// What: 開発フロー 6 ステップの表示データ型。モーダルは画像 1 枚だけ。

export type DevFlowStepId =
  | 'requirements'
  | 'design'
  | 'implementation'
  | 'second-test'
  | 'verification'
  | 'deploy';

export type DevFlowStep = {
  id: DevFlowStepId;
  no: string;
  title: string;
  who: string;
  body: string;
  /** モーダル内に表示するフロー図画像の URL（public/devflow/ 配下）。 */
  image: string;
};
