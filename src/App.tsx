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

// Default: March 2026 (our test month)
const defaultStart = '2026-03-01';
const defaultEnd = '2026-03-31';

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

  const fetchData = useCallback(async (start: string, end: string) => {
    const months = getSheetMonths(start, end);
    const toFetch = months.filter((m) => SHEET_URLS[m] && !sheetData[m]);

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
    fetchData(startDate, endDate);
  }, [startDate, endDate, fetchData]);

  // Merge data: use Sheet data where available, mock data as fallback
  const months = getSheetMonths(startDate, endDate);
  const hasSheetData = months.some((m) => sheetData[m]);

  let orders: Order[];
  let funnel: FunnelData[];
  let summary: MonthlySummary;

  if (hasSheetData) {
    // Collect all orders from sheet data within range
    const allSheetOrders: Order[] = [];
    const allFunnels: FunnelData[][] = [];
    const allSummaries: MonthlySummary[] = [];

    for (const m of months) {
      if (sheetData[m]) {
        allSheetOrders.push(...sheetData[m].orders);
        allFunnels.push(sheetData[m].funnel);
        allSummaries.push(sheetData[m].summary);
      }
    }

    // Filter orders by exact date range
    orders = allSheetOrders.filter((o) => o.quoteDate >= startDate && o.quoteDate <= endDate);

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

  // Merge: Notion MD follow-ups + orders with status '跟進中' (avoid duplicates)
  const followUpCompanies = new Set(followUps.map((f) => f.companyName));
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
  const mergedFollowUps = [...followUps, ...ordersFollowUp];

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

        <FollowUpList items={mergedFollowUps} loading={followUpLoading} />
      </main>
    </div>
  );
}
