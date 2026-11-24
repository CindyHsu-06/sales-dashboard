import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import type { Order, OrderStatus } from '../types';

interface OrderTableProps {
  orders: Order[];
}

const tabs: { label: string; filter: (o: Order) => boolean }[] = [
  { label: '全部', filter: () => true },
  { label: '跟進中', filter: (o) => o.status === '已報價' || o.status === '已簽核' || o.status === '跟進中' },
  { label: '已成交', filter: (o) => o.status === '已入帳' || o.status === '未入帳' },
  { label: '已入帳', filter: (o) => o.status === '已入帳' },
  { label: '未入帳追蹤', filter: (o) => o.status === '未入帳' },
  { label: '未採購', filter: (o) => o.status === '未採購' },
];

const statusBadge: Record<OrderStatus, string> = {
  '已報價': 'bg-brand-100 text-brand-700',
  '已簽核': 'bg-sky-100 text-sky-700',
  '跟進中': 'bg-amber-100 text-amber-700',
  '未採購': 'bg-slate-100 text-slate-600',
  '已入帳': 'bg-emerald-100 text-emerald-700',
  '未入帳': 'bg-red-100 text-red-700',
};

const fmt = (n: number) => new Intl.NumberFormat('zh-TW').format(n);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function OrderTable({ orders }: OrderTableProps) {
  const [activeTab, setActiveTab] = useState(0);
  const filtered = orders.filter(tabs[activeTab].filter);

  return (
    <div className="panel p-5">
      <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-4">
        <ClipboardList className="w-[18px] h-[18px] text-brand-500" />
        訂單列表
      </h3>

      {/* Segmented tabs */}
      <div className="grid grid-cols-3 md:grid-cols-6 border border-slate-200 rounded-lg overflow-hidden mb-4">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-2.5 text-xs sm:text-sm font-bold transition-colors border-slate-200 [&:not(:last-child)]:border-r ${
              i === activeTab
                ? 'bg-brand-500 text-white'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-600'
            }`}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums">{orders.filter(t.filter).length}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
              <th className="px-4 py-3 font-medium">企業名稱</th>
              <th className="px-4 py-3 font-medium">報價日期</th>
              <th className="px-4 py-3 font-medium">入帳日期</th>
              <th className="px-4 py-3 font-medium text-right">總進價</th>
              <th className="px-4 py-3 font-medium text-right">採購總金額</th>
              <th className="px-4 py-3 font-medium text-right">訂單總金額</th>
              <th className="px-4 py-3 font-medium text-right">毛利率</th>
              <th className="px-4 py-3 font-medium">狀態</th>
              <th className="px-4 py-3 font-medium">備註</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  此分類暫無資料
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{o.companyName}</td>
                  <td className="px-4 py-3 text-slate-500">{o.quoteDate}</td>
                  <td className="px-4 py-3 text-slate-500">{o.entryDate || '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(o.totalCost)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(o.purchaseAmount)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt(o.orderAmount)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${o.grossMargin < 0.08 ? 'text-red-600' : 'text-slate-700'}`}>
                    {pct(o.grossMargin)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusBadge[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{o.note}</td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-sm">
                <td className="px-4 py-3 text-slate-700">總計 ({filtered.length} 筆)</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right text-slate-700">{fmt(filtered.reduce((s, o) => s + o.totalCost, 0))}</td>
                <td className="px-4 py-3 text-right text-slate-700">{fmt(filtered.reduce((s, o) => s + o.purchaseAmount, 0))}</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(filtered.reduce((s, o) => s + o.orderAmount, 0))}</td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {(() => {
                    const totalCost = filtered.reduce((s, o) => s + o.totalCost, 0);
                    const totalPurchase = filtered.reduce((s, o) => s + o.purchaseAmount, 0);
                    const avgMargin = totalPurchase > 0 ? 1 - totalCost / totalPurchase : 0;
                    return pct(avgMargin);
                  })()}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
