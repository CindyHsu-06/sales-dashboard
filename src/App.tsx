import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
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

// Default to the current month, falling back to the latest month that has a Sheet URL
function getDefaultMonth(): string {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (SHEET_URLS[current]) return current;
  const available = Object.keys(SHEET_URLS).sort();
  return available[available.length - 1];
}

const defaultMonth = getDefaultMonth();
const [defaultYear, defaultMonthNum] = defaultMonth.split('-').map(Number);
const defaultStart = `${defaultMonth}-01`;
const defaultEnd = `${defaultMonth}-${String(new Date(defaultYear, defaultMonthNum, 0).getDate()).padStart(2, '0')}`;

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
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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

    const results: Record<string, SheetData> = {};
    const failedMonths: string[] = [];

    const outcomes = await Promise.allSettled(
      toFetch.map(async (m) => {
        const config = SHEET_URLS[m];
        const csv = await fetchSheetCSV(config.url);
        results[m] = parseSheetCSV(csv, config.year, config.month);
      })
    );
    outcomes.forEach((outcome, i) => {
      if (outcome.status === 'rejected') failedMonths.push(toFetch[i]);
    });

    setSheetData((prev) => ({ ...prev, ...results }));
    setError(failedMonths.length > 0 ? `部分月份載入失敗（${failedMonths.join('、')}），可能是該月分頁的發布連結已失效` : null);
    setLoading(false);
    setLastUpdated(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
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
    <div className="min-h-screen bg-[#f5f6f8]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-pink-500 flex items-center justify-center text-white text-xl font-bold leading-none">
                Y
              </div>
              <span className="text-lg font-bold text-slate-800 whitespace-nowrap">企業採購 Dashboard</span>
            </div>
            {/* Only surface status when something needs attention */}
            {loading && (
              <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />載入中
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full truncate" title={error}>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="truncate">{error}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {lastUpdated && (
              <span className="text-xs text-slate-400 hidden md:inline">上次更新：{lastUpdated}</span>
            )}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors"
            >
              重新整理
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <h2 className="text-xl font-bold text-slate-800">銷售數據總覽</h2>

        <section className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-bold text-slate-800">業績數據統計</h3>
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
          </div>
          <SummaryCards summary={summary} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
