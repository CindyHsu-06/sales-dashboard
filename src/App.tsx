import { useState } from 'react';
import DateRangePicker from './components/DateRangePicker';
import SummaryCards from './components/SummaryCards';
import CustomerFunnel from './components/CustomerFunnel';
import MarginChart from './components/MarginChart';
import OrderTable from './components/OrderTable';
import FollowUpList from './components/FollowUpList';
import {
  getFilteredOrders,
  getFilteredFollowUps,
  computeSummary,
  computeFunnel,
} from './mockData';

// Default: current month
const now = new Date();
const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

export default function App() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const orders = getFilteredOrders(startDate, endDate);
  const followUps = getFilteredFollowUps(startDate, endDate);
  const funnel = computeFunnel(orders);
  const summary = computeSummary(orders, startDate, endDate);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">業務追蹤 Dashboard</h1>
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

        <FollowUpList items={followUps} />
      </main>
    </div>
  );
}
