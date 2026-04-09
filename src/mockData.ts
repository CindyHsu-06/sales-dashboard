import type { Order, FollowUpItem, FunnelData, MonthlySummary } from './types';

function makeOrder(
  id: string,
  companyName: string,
  quoteDate: string,
  totalCost: number,
  purchaseAmount: number,
  shipping: number,
  note: string,
  status: Order['status'],
): Order {
  return {
    id,
    companyName,
    quoteDate,
    totalCost,
    purchaseAmount,
    orderAmount: purchaseAmount + shipping,
    grossMargin: 1 - totalCost / purchaseAmount,
    note,
    status,
  };
}

const allOrders: Order[] = [
  // 2025-11
  makeOrder('O-202511-001', '台積電', '2025-11-03', 350000, 395000, 4500, 'Q4 設備維護採購', '已入帳'),
  makeOrder('O-202511-002', '鴻海精密', '2025-11-06', 128000, 142000, 1800, '產線耗材補貨', '已入帳'),
  makeOrder('O-202511-003', '聯發科技', '2025-11-10', 480000, 510000, 5500, '5G 晶片測試設備', '已簽核'),
  makeOrder('O-202511-004', '中華電信', '2025-11-14', 72000, 85000, 1200, '機房網路模組', '已入帳'),
  makeOrder('O-202511-005', '國泰人壽', '2025-11-18', 55000, 58000, 800, '辦公印表機', '已報價'),
  makeOrder('O-202511-006', '台達電子', '2025-11-22', 290000, 320000, 3800, '工業電源模組', '未入帳'),
  makeOrder('O-202511-007', '廣達電腦', '2025-11-26', 410000, 438000, 5000, '伺服器代工零件', '已入帳'),

  // 2025-12
  makeOrder('O-202512-001', '日月光半導體', '2025-12-02', 195000, 218000, 2500, '封裝測試耗材', '已入帳'),
  makeOrder('O-202512-002', '華碩電腦', '2025-12-05', 520000, 568000, 6500, '年末筆電批量', '已入帳'),
  makeOrder('O-202512-003', '和碩聯合', '2025-12-09', 310000, 335000, 4000, '組裝線升級', '已簽核'),
  makeOrder('O-202512-004', '遠傳電信', '2025-12-12', 68000, 75000, 1000, '通訊設備零件', '已報價'),
  makeOrder('O-202512-005', '富邦金控', '2025-12-16', 145000, 158000, 2000, '資安軟硬體', '未入帳'),
  makeOrder('O-202512-006', '台積電', '2025-12-19', 620000, 680000, 7500, '年度設備結算', '已入帳'),
  makeOrder('O-202512-007', '緯創資通', '2025-12-22', 178000, 195000, 2200, '面板零組件', '已報價'),
  makeOrder('O-202512-008', '仁寶電腦', '2025-12-28', 245000, 262000, 3000, '代工專案結案', '已入帳'),

  // 2026-01
  makeOrder('O-202601-001', '台積電', '2026-01-05', 280000, 320000, 3500, 'Q1 設備採購', '已入帳'),
  makeOrder('O-202601-002', '鴻海精密', '2026-01-08', 150000, 168000, 2000, '辦公耗材', '已入帳'),
  makeOrder('O-202601-003', '聯發科技', '2026-01-12', 420000, 450000, 5000, '伺服器設備', '已簽核'),
  makeOrder('O-202601-004', '中華電信', '2026-01-15', 95000, 105000, 1500, '網路設備', '已報價'),
  makeOrder('O-202601-005', '富邦金控', '2026-01-20', 180000, 195000, 2500, 'IT 設備更新', '未入帳'),
  makeOrder('O-202601-006', '國泰人壽', '2026-01-22', 62000, 65000, 1000, '印表機耗材', '已入帳'),
  makeOrder('O-202601-007', '廣達電腦', '2026-01-25', 310000, 340000, 4000, '筆電批量採購', '已報價'),

  // 2026-02
  makeOrder('O-202602-001', '台達電子', '2026-02-03', 520000, 580000, 6000, '工業電源設備', '已入帳'),
  makeOrder('O-202602-002', '日月光半導體', '2026-02-06', 185000, 210000, 2500, '測試設備零件', '已入帳'),
  makeOrder('O-202602-003', '和碩聯合', '2026-02-10', 340000, 365000, 4000, '組裝線設備', '已簽核'),
  makeOrder('O-202602-004', '遠傳電信', '2026-02-14', 75000, 82000, 1200, '通訊模組', '已報價'),
  makeOrder('O-202602-005', '兆豐金控', '2026-02-18', 128000, 140000, 1800, '資安設備', '未入帳'),
  makeOrder('O-202602-006', '華碩電腦', '2026-02-20', 460000, 490000, 5500, '顯示器批量', '已入帳'),
  makeOrder('O-202602-007', '緯創資通', '2026-02-24', 210000, 228000, 3000, '伺服器零組件', '已報價'),
  makeOrder('O-202602-008', '台灣大哥大', '2026-02-26', 92000, 105000, 1500, '基地台設備', '未入帳'),

  // 2026-03
  makeOrder('O-202603-001', '台積電', '2026-03-02', 550000, 620000, 7000, 'Q1 加購設備', '已入帳'),
  makeOrder('O-202603-002', '鴻海精密', '2026-03-05', 230000, 258000, 3000, '工廠設備升級', '已入帳'),
  makeOrder('O-202603-003', '宏碁電腦', '2026-03-08', 175000, 195000, 2500, '教育專案筆電', '已簽核'),
  makeOrder('O-202603-004', '聯發科技', '2026-03-12', 380000, 410000, 4500, '研發設備', '已報價'),
  makeOrder('O-202603-005', '第一金控', '2026-03-15', 145000, 152000, 2000, '辦公設備', '未入帳'),
  makeOrder('O-202603-006', '中華電信', '2026-03-18', 88000, 98000, 1200, '光纖模組', '已入帳'),
  makeOrder('O-202603-007', '仁寶電腦', '2026-03-22', 295000, 310000, 3500, '代工零組件', '已報價'),
  makeOrder('O-202603-008', '玉山金控', '2026-03-25', 110000, 118000, 1500, 'ATM 設備', '未入帳'),
  makeOrder('O-202603-009', '光寶科技', '2026-03-28', 198000, 215000, 2800, '電源供應器', '已簽核'),

  // 2026-04
  makeOrder('O-202604-001', '台達電子', '2026-04-01', 480000, 530000, 6000, 'Q2 產線設備', '已入帳'),
  makeOrder('O-202604-002', '台積電', '2026-04-03', 620000, 680000, 7500, '晶圓廠設備', '已簽核'),
  makeOrder('O-202604-003', '鴻海精密', '2026-04-05', 290000, 315000, 3500, '深圳廠區採購', '已報價'),
  makeOrder('O-202604-004', '日月光半導體', '2026-04-07', 165000, 172000, 2000, '封測耗材', '未入帳'),
  makeOrder('O-202604-005', '聯發科技', '2026-04-09', 510000, 560000, 6000, '5G 測試設備', '已報價'),
  makeOrder('O-202604-006', '富邦金控', '2026-04-02', 135000, 148000, 1800, '分行設備更新', '已入帳'),
];

const allFollowUps: FollowUpItem[] = [
  { id: 'F-11-1', companyName: '國泰人壽', quoteDate: '2025-11-18', quoteAmount: 58000, expectedCloseDate: '2025-12-18', followUpStatus: '待跟進', lastContactDate: '2025-11-25', note: '預算審核中' },
  { id: 'F-12-1', companyName: '遠傳電信', quoteDate: '2025-12-12', quoteAmount: 75000, expectedCloseDate: '2026-01-12', followUpStatus: '已回覆', lastContactDate: '2025-12-20', note: '需調整規格' },
  { id: 'F-12-2', companyName: '緯創資通', quoteDate: '2025-12-22', quoteAmount: 195000, expectedCloseDate: '2026-01-20', followUpStatus: '跟進中', lastContactDate: '2025-12-28', note: '窗口休假中' },
  { id: 'F-01-1', companyName: '中華電信', quoteDate: '2026-01-15', quoteAmount: 105000, expectedCloseDate: '2026-02-15', followUpStatus: '跟進中', lastContactDate: '2026-01-28', note: '等待內部簽核' },
  { id: 'F-01-2', companyName: '廣達電腦', quoteDate: '2026-01-25', quoteAmount: 340000, expectedCloseDate: '2026-02-28', followUpStatus: '待跟進', lastContactDate: '2026-01-25', note: '報價已送出，待回覆' },
  { id: 'F-02-1', companyName: '遠傳電信', quoteDate: '2026-02-14', quoteAmount: 82000, expectedCloseDate: '2026-03-15', followUpStatus: '已回覆', lastContactDate: '2026-02-25', note: '需調整規格' },
  { id: 'F-02-2', companyName: '緯創資通', quoteDate: '2026-02-24', quoteAmount: 228000, expectedCloseDate: '2026-03-20', followUpStatus: '跟進中', lastContactDate: '2026-02-28', note: '窗口出差中' },
  { id: 'F-03-1', companyName: '聯發科技', quoteDate: '2026-03-12', quoteAmount: 410000, expectedCloseDate: '2026-04-10', followUpStatus: '跟進中', lastContactDate: '2026-03-25', note: '預算審核中' },
  { id: 'F-03-2', companyName: '仁寶電腦', quoteDate: '2026-03-22', quoteAmount: 310000, expectedCloseDate: '2026-04-15', followUpStatus: '待跟進', lastContactDate: '2026-03-22', note: '初次報價' },
  { id: 'F-04-1', companyName: '鴻海精密', quoteDate: '2026-04-05', quoteAmount: 315000, expectedCloseDate: '2026-05-05', followUpStatus: '待跟進', lastContactDate: '2026-04-05', note: '等待窗口確認規格' },
  { id: 'F-04-2', companyName: '聯發科技', quoteDate: '2026-04-09', quoteAmount: 560000, expectedCloseDate: '2026-05-10', followUpStatus: '跟進中', lastContactDate: '2026-04-09', note: '5G 專案評估中' },
];

// Monthly targets for achievement rate calculation
const monthlyTargets: Record<string, number> = {
  '2025-11': 750000,
  '2025-12': 800000,
  '2026-01': 800000,
  '2026-02': 850000,
  '2026-03': 900000,
  '2026-04': 950000,
};

// --- Public API ---

export function getFilteredOrders(startDate: string, endDate: string): Order[] {
  return allOrders.filter((o) => o.quoteDate >= startDate && o.quoteDate <= endDate);
}

export function getFilteredFollowUps(startDate: string, endDate: string): FollowUpItem[] {
  return allFollowUps.filter((f) => f.quoteDate >= startDate && f.quoteDate <= endDate);
}

export function computeSummary(orders: Order[], startDate: string, endDate: string): MonthlySummary {
  const received = orders.filter((o) => o.status === '已入帳');
  const unreceived = orders.filter((o) => o.status === '未入帳');
  const dealOrders = orders.filter((o) => o.status === '已入帳' || o.status === '未入帳');

  const totalDealAmount = dealOrders.reduce((s, o) => s + o.orderAmount, 0);
  const monthlyReceived = received.reduce((s, o) => s + o.orderAmount, 0);
  const monthlyUnreceived = unreceived.reduce((s, o) => s + o.orderAmount, 0);

  // Sum targets for months in range
  let target = 0;
  for (const [month, t] of Object.entries(monthlyTargets)) {
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;
    if (monthEnd >= startDate && monthStart <= endDate) {
      target += t;
    }
  }

  const achievementRate = target > 0 ? (totalDealAmount / target) * 100 : 0;

  return { totalDealAmount, achievementRate, monthlyReceived, monthlyUnreceived, target };
}

export function computeFunnel(orders: Order[]): FunnelData[] {
  const uniqueCompanies = new Set(orders.map((o) => o.companyName));
  const quoted = new Set(orders.filter((o) => o.status === '已報價' || o.status === '已簽核').map((o) => o.companyName));
  const signing = new Set(orders.filter((o) => o.status === '已簽核').map((o) => o.companyName));
  const deal = new Set(orders.filter((o) => o.status === '已入帳' || o.status === '未入帳').map((o) => o.companyName));
  // 未採購 = 曾報價但在此區間內沒有成交的公司
  const noDeal = new Set([...quoted].filter((c) => !deal.has(c)));

  return [
    { stage: '新接觸', count: uniqueCompanies.size },
    { stage: '已報價', count: quoted.size + deal.size },
    { stage: '跟進中', count: signing.size + deal.size },
    { stage: '成交', count: deal.size },
    { stage: '未採購', count: noDeal.size },
  ];
}

export function getDateRange(): { min: string; max: string } {
  const dates = allOrders.map((o) => o.quoteDate).sort();
  return { min: dates[0], max: dates[dates.length - 1] };
}
