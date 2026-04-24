import { useState, useEffect, useCallback } from 'react';
import DateRangePicker from './components/DateRangePicker';
import SummaryCards from './components/SummaryCards';
import CustomerFunnel from './components/CustomerFunnel';
import MarginChart from './components/MarginChart';
import OrderTable from './components/OrderTable';
import FollowUpList from './components/FollowUpList';
import { fetchSheetCSV, parseSheetCSV } from './sheetParser';
import type { SheetData } from './sheetParser';
import { SHEET_URLS } from './sheets';
import { fetchFollowUpItems } from './trackParser';
import {
  getFilteredOrders,
  computeSummary,
  computeFunnel,
} from './mockData';
import type { Order, FunnelData, MonthlySummary, FollowUpItem } from './types';

// Default: current month (April 2026)
const defaultStart = '2026-04-01';
const defaultEnd = '2026-04-30';

// Figure out which months in the date range have a Sheet URL
function getSheetMonths(start: string, end: string): string[] {
  const months: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    months.push(key);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// Apply cross-month status updates: if a later month's sheet says a company
// is 已入帳/未入帳, update that company's status in earlier months' orders
function applyCrossMonthUpdates(allData: Record<string, SheetData>): Record<string, SheetData> {
  // Collect all cross-month updates from all months
  const updates: { companyName: string; newStatus: '已入帳' | '未入帳'; entryDate: string; sourceMonth: string }[] = [];
  for (const data of Object.values(allData)) {
    updates.push(...data.crossMonthUpdates);
  }

  if (updates.length === 0) return allData;

  // Deep clone to avoid mutating cached data
  const result: Record<string, SheetData> = {};
  for (const [key, data] of Object.entries(allData)) {
    result[key] = { ...data, orders: data.orders.map((o) => ({ ...o })) };
  }

  // Apply updates: for each cross-month update, find the matching order in other months
  // Match '跟進中' (未成交) or '未入帳' (已成交待入帳) — these are the updatable states
  for (const update of updates) {
    for (const [monthKey, data] of Object.entries(result)) {
      if (monthKey === update.sourceMonth) continue; // skip the month that generated the update
      for (const order of data.orders) {
        if (
          order.companyName === update.companyName &&
          (order.status === '跟進中' || order.status === '未入帳')
        ) {
          order.status = update.newStatus;
          order.entryDate = update.entryDate;
          // Append entry month to note, e.g. "4月入帳"
          const m = parseInt(update.sourceMonth.split('-')[1]);
          const tag = `${m}月入帳`;
          if (!order.note.includes(tag)) {
            order.note = order.note ? `${order.note}；${tag}` : tag;
          }
        }
      }
    }
  }

  return result;
}

export default function App() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [sheetData, setSheetData] = useState<Record<string, SheetData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Fetch follow-up items from Notion MD files
  useEffect(() => {
    setFollowUpLoading(true);
    const basePath = import.meta.env.BASE_URL;
    fetchFollowUpItems(basePath)
      .then(setFollowUps)
      .catch(() => setFollowUps([]))
      .finally(() => setFollowUpLoading(false));
  }, []);

  // Load ALL available months on mount so cross-month updates work
  const fetchAllSheets = useCallback(async () => {
    const allMonths = Object.keys(SHEET_URLS);
    const toFetch = allMonths.filter((m) => !sheetData[m]);

    if (toFetch.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const results: Record<string, SheetData> = {};
      await Promise.all(
        toFetch.map(async (m) => {
          const config = SHEET_URLS[m];
          const csv = await fetchSheetCSV(config.url);
          results[m] = parseSheetCSV(csv, config.year, config.month);
        })
      );
      setSheetData((prev) => ({ ...prev, ...results }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入資料失敗');
    } finally {
      setLoading(false);
    }
  }, [sheetData]);

  useEffect(() => {
    fetchAllSheets();
  }, [fetchAllSheets]);

  // Apply cross-month updates across all loaded data
  const syncedData = applyCrossMonthUpdates(sheetData);

  // Merge data: use Sheet data where available, mock data as fallback
  const months = getSheetMonths(startDate, endDate);
  const hasSheetData = months.some((m) => syncedData[m]);

  let orders: Order[];
  let funnel: FunnelData[];
  let summary: MonthlySummary;

  if (hasSheetData) {
    // Collect all orders from sheet data within range
    const allSheetOrders: Order[] = [];
    const allFunnels: FunnelData[][] = [];
    const allSummaries: MonthlySummary[] = [];

    for (const m of months) {
      if (syncedData[m]) {
        allSheetOrders.push(...syncedData[m].orders);
        allFunnels.push(syncedData[m].funnel);
        allSummaries.push(syncedData[m].summary);
      }
    }

    // Filter orders by date range: include if quoteDate OR entryDate falls within range
    orders = allSheetOrders.filter((o) => {
      const quoteInRange = o.quoteDate >= startDate && o.quoteDate <= endDate;
      const entryInRange = o.entryDate ? o.entryDate >= startDate && o.entryDate <= endDate : false;
      return quoteInRange || entryInRange;
    });

    // If single month with sheet data, use its funnel directly; otherwise aggregate
    if (allFunnels.length === 1) {
      funnel = allFunnels[0];
    } else {
      // Aggregate funnel counts
      const stages = ['新接觸', '已報價', '成交', '未採購'] as const;
      funnel = stages.map((stage) => ({
        stage,
        count: allFunnels.reduce((sum, f) => sum + (f.find((d) => d.stage === stage)?.count ?? 0), 0),
        amount: allFunnels.reduce((sum, f) => sum + (f.find((d) => d.stage === stage)?.amount ?? 0), 0),
      }));
    }

    // Aggregate summaries
    summary = allSummaries.reduce(
      (acc, s) => ({
        totalDealAmount: acc.totalDealAmount + s.totalDealAmount,
        achievementRate: 0, // recalculate below
        monthlyReceived: acc.monthlyReceived + s.monthlyReceived,
        monthlyUnreceived: acc.monthlyUnreceived + s.monthlyUnreceived,
        target: acc.target + s.target,
        dealCount: acc.dealCount + s.dealCount,
      }),
      { totalDealAmount: 0, achievementRate: 0, monthlyReceived: 0, monthlyUnreceived: 0, target: 0, dealCount: 0 },
    );
    summary.achievementRate = summary.target > 0 ? (summary.totalDealAmount / summary.target) * 100 : 0;
  } else {
    // Fallback to mock data
    orders = getFilteredOrders(startDate, endDate);
    funnel = computeFunnel(orders);
    summary = computeSummary(orders, startDate, endDate);
  }

  // Build a map of company → latest order status (across all loaded months)
  const companyStatusMap = new Map<string, string>();
  for (const o of orders) {
    companyStatusMap.set(o.companyName, o.status);
  }

  // Filter Notion MD follow-ups: remove companies that are no longer 跟進中
  // (e.g. 已入帳, 未入帳, 未採購 → resolved, no need to follow up)
  const activeFollowUps = followUps.filter((f) => {
    // Skip items marked as 不採購 in Notion itself
    if (f.status.includes('不採購')) return false;
    const orderStatus = companyStatusMap.get(f.companyName);
    if (!orderStatus) return true; // no matching order → keep in list
    return orderStatus === '跟進中' || orderStatus === '已報價' || orderStatus === '已簽核';
  });

  // Add orders with status '跟進中' that aren't already in Notion follow-ups
  const followUpCompanies = new Set(activeFollowUps.map((f) => f.companyName));
  const ordersFollowUp: FollowUpItem[] = orders
    .filter((o) => o.status === '跟進中' && !followUpCompanies.has(o.companyName))
    .map((o) => ({
      id: o.id,
      companyName: o.companyName,
      contact: '',
      phone: '',
      email: '',
      status: '跟進中',
      quoteDate: o.quoteDate,
      lineId: '',
      lastModified: o.quoteDate,
      taxId: '',
      orderDetailUrl: '',
      notes: [],
    }));
  // Show follow-ups where quoteDate is on or before the end of selected range
  // (active follow-ups carry forward until resolved, but don't show future ones)
  const mergedFollowUps = [...activeFollowUps, ...ordersFollowUp]
    .filter((f) => f.quoteDate <= endDate);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">企業採購 Dashboard</h1>
            {loading && (
              <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full animate-pulse">
                載入中...
              </span>
            )}
            {error && (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
                {error}
              </span>
            )}
          </div>
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <SummaryCards summary={summary} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerFunnel data={funnel} />
          <MarginChart orders={orders} />
        </div>

        <OrderTable orders={orders} />

        {(mergedFollowUps.length > 0 || followUpLoading) && (
          <FollowUpList items={mergedFollowUps} loading={followUpLoading} />
        )}
      </main>
    </div>
  );
}
