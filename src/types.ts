export type OrderStatus = '已報價' | '已簽核' | '跟進中' | '未採購' | '已入帳' | '未入帳';

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

export interface FollowUpNote {
  date: string;              // e.g. "2026/3/24"
  content: string;           // 紀錄內容
}

export interface FollowUpItem {
  id: string;
  companyName: string;
  contact: string;           // 聯絡人
  phone: string;             // 電話
  email: string;             // 電子郵件
  status: string;            // 狀態 e.g. "(階段二)跟催第二次"
  quoteDate: string;         // 進單日 (YYYY-MM-DD)
  lineId: string;            // LINE ID 名稱
  lastModified: string;      // 最後異動時間 (YYYY-MM-DD)
  taxId: string;             // 統編
  orderDetailUrl: string;    // 訂單明細連結
  notes: FollowUpNote[];     // 跟進紀錄
}

export type FunnelStage = '新接觸' | '已報價' | '成交' | '未採購';

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
  dealCount: number;          // 成交筆數
}
