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

// Cross-month status updates: orders from other months that got resolved in this month
export interface CrossMonthUpdate {
  companyName: string;
  newStatus: '已入帳' | '未入帳';
  entryDate: string;       // 入帳/簽核日期
  sourceMonth: string;     // which month this update comes from (e.g. "2026-04")
}

export interface SheetData {
  orders: Order[];
  funnel: FunnelData[];
  summary: MonthlySummary;
  crossMonthUpdates: CrossMonthUpdate[];
}

/** Split CSV text into rows, handling quoted fields that contain newlines */
function splitCSVRows(csv: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"' && csv[i + 1] === '"') {
        current += '""';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
        current += ch;
      } else {
        // Replace newlines inside quoted fields with space
        current += (ch === '\n' || ch === '\r') ? ' ' : ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        current += ch;
      } else if (ch === '\n') {
        rows.push(current);
        current = '';
      } else if (ch === '\r') {
        // skip \r
      } else {
        current += ch;
      }
    }
  }
  if (current.trim()) rows.push(current);
  return rows;
}

export function parseSheetCSV(csv: string, year: number, month: number): SheetData {
  const lines = splitCSVRows(csv).map((l) => parseCSVLine(l));

  // Extract funnel data from right-side columns (cols 9-13 after B/C split)
  let newContacts = 0;
  let quotedCount = 0;
  let closedCount = 0;
  let notPurchased = 0;
  let totalDealAmount = 0;
  let totalQuotedAmount = 0;

  for (const row of lines) {
    // Stats row: first data row has numeric values in cols 9-13
    if (row[9] && /^\d+$/.test(row[9].trim())) {
      newContacts = parseInt(row[9]);
      quotedCount = parseInt(row[10]) || 0;
      closedCount = parseInt(row[12]) || 0;
      notPurchased = parseInt(row[13]) || 0;
    }
    if (row[9]?.includes('當前累計成交金額') || row[9]?.includes('本月累計成交金額')) {
      totalDealAmount = parseNTD(row[11] || '');
    }
    if (row[9]?.includes('當前累計提報金額') || row[9]?.includes('本月累計提報金額')) {
      totalQuotedAmount = parseNTD(row[11] || '');
    }
  }

  // Parse orders by section
  const orders: Order[] = [];
  const crossMonthUpdates: CrossMonthUpdate[] = [];
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
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
      // 本月已報價訂單: 企業抬頭(0), 諮詢日期(1), [空](2), 總進價(3), 採購總金額(4), 訂單總金額(5), 毛利率(6), 備註(7,8)
      const quoteDate = parseSheetDate(row[1], year);
      const totalCost = parseNTD(row[3]);
      const purchaseAmount = parseNTD(row[4]);
      const orderAmount = parseNTD(row[5]);
      const grossMargin = parsePercent(row[6]);
      // 備註可能跨欄（col 7 和 col 8），合併檢查
      const rawNote = [row[7], row[8]].filter(Boolean).map((s) => s.trim()).join(' ').trim();
      const isNotPurchased = rawNote.includes('不採購');
      const cleanNote = rawNote.replace(/\s*明確不採購\s*/g, '').replace(/\s*不採購\s*/g, '').trim();

      orders.push({
        id,
        companyName,
        quoteDate,
        totalCost,
        purchaseAmount,
        orderAmount,
        grossMargin,
        note: cleanNote,
        status: isNotPurchased ? '未採購' : '已報價',
      });
    } else if (currentSection === 'signed_current' || currentSection === 'signed_other' || currentSection === 'signed_external') {
      // 入帳區: 企業抬頭(0), 諮詢日期(1), 入帳日期(2), 營業額(3), 總進價(4), 利潤(5), 毛利率(6), 備註(7)
      const entryDate = parseSheetDate(row[2], year) || parseSheetDate(row[1], year); // 入帳日期優先，fallback 諮詢日期
      const revenue = parseNTD(row[3]);
      const totalCost = parseNTD(row[4]);
      const grossMargin = parsePercent(row[6]);
      const note = row[7]?.trim() || '';

      // 非本月簽核 本月入帳 → 業績算簽核當月，不計入本月 orders，只做跨月更新
      if (currentSection === 'signed_external') {
        crossMonthUpdates.push({
          companyName,
          newStatus: '已入帳',
          entryDate,
          sourceMonth: monthKey,
        });
        continue;
      }

      // Find matching quoted order and update its status
      const existingIdx = orders.findIndex(
        (o) => o.companyName === companyName && o.status === '已報價'
      );
      const quoteDate = parseSheetDate(row[1], year); // 諮詢日期
      if (existingIdx >= 0) {
        orders[existingIdx].status = '已入帳';
        orders[existingIdx].entryDate = entryDate;
      } else {
        // 本月簽核 非當月報價單 → 新增為本月 order，並做跨月更新（把更早月份的跟進中 → 已入帳）
        if (currentSection === 'signed_other') {
          crossMonthUpdates.push({
            companyName,
            newStatus: '已入帳',
            entryDate,
            sourceMonth: monthKey,
          });
        }
        orders.push({
          id,
          companyName,
          quoteDate: quoteDate || entryDate,
          entryDate,
          totalCost,
          purchaseAmount: revenue,
          orderAmount: revenue,
          grossMargin,
          note: note || (currentSection === 'signed_other' ? '非當月報價單' : ''),
          status: '已入帳',
        });
      }
    } else if (currentSection === 'unreceived') {
      // 未入帳: 企業抬頭(0), 諮詢日期(1), 入帳日期(2), 營業額(3), 總進價(4), 利潤(5), 毛利率(6), 備註(7)
      const entryDate = parseSheetDate(row[2], year) || parseSheetDate(row[1], year);
      const revenue = parseNTD(row[3]);
      const totalCost = parseNTD(row[4]);
      const grossMargin = parsePercent(row[6]);
      const note = row[7]?.trim() || '';

      const quoteDate = parseSheetDate(row[1], year);
      const existingIdx = orders.findIndex(
        (o) => o.companyName === companyName && o.status === '已報價'
      );
      if (existingIdx >= 0) {
        orders[existingIdx].status = '未入帳';
        orders[existingIdx].entryDate = entryDate;
      } else {
        crossMonthUpdates.push({
          companyName,
          newStatus: '未入帳',
          entryDate,
          sourceMonth: monthKey,
        });
        orders.push({
          id,
          companyName,
          quoteDate: quoteDate || entryDate,
          entryDate,
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

  // Remaining '已報價' that weren't matched to 入帳/未入帳/未採購 → '跟進中'
  for (const o of orders) {
    if (o.status === '已報價') {
      o.status = '跟進中';
    }
  }

  // Compute amounts per funnel stage from actual order statuses
  const allAmount = orders.reduce((s, o) => s + o.orderAmount, 0);
  const closedAmount = orders.filter((o) => o.status === '已入帳' || o.status === '未入帳').reduce((s, o) => s + o.orderAmount, 0);
  const notPurchasedOrders = orders.filter((o) => o.status === '未採購');
  const notPurchasedAmount = notPurchasedOrders.reduce((s, o) => s + o.orderAmount, 0);

  // Build funnel — use sheet counts if available, otherwise compute from orders
  const funnel: FunnelData[] = [
    { stage: '新接觸', count: newContacts, amount: allAmount },
    { stage: '已報價', count: quotedCount || orders.length, amount: allAmount },
    { stage: '成交', count: closedCount || orders.filter((o) => o.status === '已入帳' || o.status === '未入帳').length, amount: closedAmount },
    { stage: '未採購', count: notPurchased || notPurchasedOrders.length, amount: notPurchasedAmount },
  ];

  // Build summary
  const receivedOrders = orders.filter((o) => o.status === '已入帳');
  const unreceivedOrders = orders.filter((o) => o.status === '未入帳');
  const monthlyReceived = receivedOrders.reduce((s, o) => s + o.orderAmount, 0);
  const monthlyUnreceived = unreceivedOrders.reduce((s, o) => s + o.orderAmount, 0);

  const dealOrderCount = receivedOrders.length + unreceivedOrders.length;
  const summary: MonthlySummary = {
    totalDealAmount: totalDealAmount || monthlyReceived + monthlyUnreceived,
    achievementRate: totalQuotedAmount > 0 ? ((totalDealAmount || monthlyReceived) / totalQuotedAmount) * 100 : 0,
    monthlyReceived,
    monthlyUnreceived,
    target: totalQuotedAmount,
    dealCount: dealOrderCount,
  };

  return { orders, funnel, summary, crossMonthUpdates };
}

export async function fetchSheetCSV(csvUrl: string): Promise<string> {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${res.status}`);
  return res.text();
}
