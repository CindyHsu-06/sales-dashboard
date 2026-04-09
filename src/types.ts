export type OrderStatus = '已報價' | '已簽核' | '已入帳' | '未入帳';

export type FollowUpStatus = '待跟進' | '跟進中' | '已回覆' | '待結案';

export interface Order {
  id: string;
  companyName: string;       // 企業名稱
  quoteDate: string;         // 報價日期 (YYYY-MM-DD)
  totalCost: number;         // 總進價（成本）
  purchaseAmount: number;    // 採購總金額
  orderAmount: number;       // 訂單總金額（含運費）
  grossMargin: number;       // 毛利率 = 1 - totalCost / purchaseAmount
  note: string;              // 備註
  status: OrderStatus;       // 狀態
}

export interface FollowUpItem {
  id: string;
  companyName: string;
  quoteDate: string;
  quoteAmount: number;
  expectedCloseDate: string; // 預計結案日
  followUpStatus: FollowUpStatus;
  lastContactDate: string;
  note: string;
}

export type FunnelStage = '新接觸' | '已報價' | '跟進中' | '成交' | '未採購';

export interface FunnelData {
  stage: FunnelStage;
  count: number;
  amount: number;
}

export interface MonthlySummary {
  totalDealAmount: number;    // 累計成交金額
  achievementRate: number;    // 達成率
  monthlyReceived: number;    // 本月入帳
  monthlyUnreceived: number;  // 未入帳金額
  target: number;             // 月目標
}
