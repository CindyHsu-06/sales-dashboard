import type { Order, FunnelData, MonthlySummary } from './types';

// --- CSV helpers ---

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseNTD(s: string): number {
  // Handle formats like "NT$5,517 ", "$164,129", "NT$0"
  const cleaned = s.replace(/[NT$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parsePercent(s: string): number {
  const cleaned = s.replace(/[%\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num / 100;
}

function parseSheetDate(dateStr: string, year: number): string {
  // Handle "3月3日" → "2026-03-03"
  const match = dateStr.match(/(\d+)月(\d+)日/);
  if (match) {
    const m = String(parseInt(match[1])).padStart(2, '0');
    const d = String(parseInt(match[2])).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }
  return '';
}

// --- Section detection ---

function isSectionHeader(row: string[]): string | null {
  const first = row[0]?.trim();
  if (first === '本月已報價訂單') return 'quoted';
  if (first?.startsWith('本月簽核') && first.includes('當月報價單')) return 'signed_current';
  if (first?.startsWith('本月簽核') && first.includes('非當月報價單')) return 'signed_other';
  if (first === '非本月簽核 本月入帳') return 'signed_external';
  if (first === '以下未入帳') return 'unreceived';
  return null;
}

function isDataRow(row: string[]): boolean {
  // A data row has a company name in col 0 and a date-like value in col 1
  const name = row[0]?.trim();
  const date = row[1]?.trim();
  if (!name || !date) return false;
  if (name === '企業抬頭' || name === '總計') return false;
  if (name.startsWith('週報') || name.startsWith('日期')) return false;
  return /\d+月\d+日/.test(date);
}

export interface SheetData {
  orders: Order[];
  funnel: FunnelData[];
  summary: MonthlySummary;
}

export function parseSheetCSV(csv: string, year: number, month: number): SheetData {
  const lines = csv.split('\n').map((l) => parseCSVLine(l));

  // Extract funnel data from right-side columns (cols 8-12 in the header area)
  let newContacts = 0;
  let quotedCount = 0;
  let followingUp = 0;
  let closedCount = 0;
  let notPurchased = 0;
  let totalDealAmount = 0;
  let totalQuotedAmount = 0;

  for (const row of lines) {
    // Right side stats - look for the cells with numbers next to labels
    if (row[8]?.includes('當前新接觸企業數')) {
      // The numbers are on the same row in col 8-12 for header, but values are in next cols
      // Actually looking at the CSV, the counts are on the first data row (row with 國統)
    }
    if (row[8] && /^\d+$/.test(row[8].trim())) {
      newContacts = parseInt(row[8]);
      quotedCount = parseInt(row[9]) || 0;
      followingUp = parseInt(row[10]) || 0;
      closedCount = parseInt(row[11]) || 0;
      notPurchased = parseInt(row[12]) || 0;
    }
    if (row[8]?.includes('當前累計成交金額') || row[8]?.includes('本月累計成交金額')) {
      totalDealAmount = parseNTD(row[10] || '');
    }
    if (row[8]?.includes('當前累計提報金額') || row[8]?.includes('本月累計提報金額')) {
      totalQuotedAmount = parseNTD(row[10] || '');
    }
  }

  // Parse orders by section
  const orders: Order[] = [];
  let currentSection: string | null = null;
  let orderId = 0;

  for (const row of lines) {
    const section = isSectionHeader(row);
    if (section) {
      currentSection = section;
      continue;
    }

    if (!currentSection || !isDataRow(row)) continue;

    orderId++;
    const mm = String(month).padStart(2, '0');
    const id = `O-${year}${mm}-${String(orderId).padStart(3, '0')}`;
    const companyName = row[0].trim();

    if (currentSection === 'quoted') {
      // 本月已報價訂單: 企業抬頭, 諮詢日期, 總進價含稅, 採購總金額含稅, 訂單總金額, 毛利率, 備註
      const quoteDate = parseSheetDate(row[1], year);
      const totalCost = parseNTD(row[2]);
      const purchaseAmount = parseNTD(row[3]);
      const orderAmount = parseNTD(row[4]);
      const grossMargin = parsePercent(row[5]);
      const note = row[6]?.trim() || '';

      orders.push({
        id,
        companyName,
        quoteDate,
        totalCost,
        purchaseAmount,
        orderAmount,
        grossMargin,
        note,
        status: '已報價',
      });
    } else if (currentSection === 'signed_current' || currentSection === 'signed_other' || currentSection === 'signed_external') {
      // 入帳區: 企業抬頭, 入帳日期, 營業額, 總進價, 利潤, 毛利率, 備註
      const entryDate = parseSheetDate(row[1], year);
      const revenue = parseNTD(row[2]);
      const totalCost = parseNTD(row[3]);
      const grossMargin = parsePercent(row[5]);
      const note = row[6]?.trim() || '';

      // Find matching quoted order and update its status
      const existingIdx = orders.findIndex(
        (o) => o.companyName === companyName && o.status === '已報價'
      );
      if (existingIdx >= 0) {
        orders[existingIdx].status = '已入帳';
      } else {
        // Not from current month's quotes (非當月報價單 or 非本月簽核)
        orders.push({
          id,
          companyName,
          quoteDate: entryDate,
          totalCost,
          purchaseAmount: revenue,
          orderAmount: revenue,
          grossMargin,
          note: note || (currentSection === 'signed_other' ? '非當月報價單' : '非本月簽核'),
          status: '已入帳',
        });
      }
    } else if (currentSection === 'unreceived') {
      // 未入帳: same structure as 入帳
      const entryDate = parseSheetDate(row[1], year);
      const revenue = parseNTD(row[2]);
      const totalCost = parseNTD(row[3]);
      const grossMargin = parsePercent(row[5]);
      const note = row[6]?.trim() || '';

      const existingIdx = orders.findIndex(
        (o) => o.companyName === companyName && o.status === '已報價'
      );
      if (existingIdx >= 0) {
        orders[existingIdx].status = '未入帳';
      } else {
        orders.push({
          id,
          companyName,
          quoteDate: entryDate,
          totalCost,
          purchaseAmount: revenue,
          orderAmount: revenue,
          grossMargin,
          note,
          status: '未入帳',
        });
      }
    }
  }

  // Compute amounts per funnel stage from orders
  const allAmount = orders.reduce((s, o) => s + o.orderAmount, 0);
  const closedAmount = orders.filter((o) => o.status === '已入帳' || o.status === '未入帳').reduce((s, o) => s + o.orderAmount, 0);
  // 未採購 = still 已報價 orders that didn't convert (approximate: last N by notPurchased count)
  const stillQuoted = orders.filter((o) => o.status === '已報價');
  const notPurchasedOrders = stillQuoted.slice(-(notPurchased || 0));
  const notPurchasedAmount = notPurchasedOrders.reduce((s, o) => s + o.orderAmount, 0);
  const followingAmount = stillQuoted.slice(0, stillQuoted.length - (notPurchased || 0)).reduce((s, o) => s + o.orderAmount, 0);

  // Build funnel from sheet data
  const funnel: FunnelData[] = [
    { stage: '新接觸', count: newContacts, amount: allAmount },
    { stage: '已報價', count: quotedCount, amount: allAmount },
    { stage: '跟進中', count: followingUp, amount: followingAmount },
    { stage: '成交', count: closedCount, amount: closedAmount },
    { stage: '未採購', count: notPurchased, amount: notPurchasedAmount },
  ];

  // Build summary
  const receivedOrders = orders.filter((o) => o.status === '已入帳');
  const unreceivedOrders = orders.filter((o) => o.status === '未入帳');
  const monthlyReceived = receivedOrders.reduce((s, o) => s + o.orderAmount, 0);
  const monthlyUnreceived = unreceivedOrders.reduce((s, o) => s + o.orderAmount, 0);

  const summary: MonthlySummary = {
    totalDealAmount: totalDealAmount || monthlyReceived + monthlyUnreceived,
    achievementRate: totalQuotedAmount > 0 ? ((totalDealAmount || monthlyReceived) / totalQuotedAmount) * 100 : 0,
    monthlyReceived,
    monthlyUnreceived,
    target: totalQuotedAmount,
  };

  return { orders, funnel, summary };
}

export async function fetchSheetCSV(csvUrl: string): Promise<string> {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${res.status}`);
  return res.text();
}
