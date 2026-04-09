import type { MonthlySummary } from '../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(n);

interface SummaryCardsProps {
  summary: MonthlySummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    { label: '累計成交金額', value: fmt(summary.totalDealAmount), color: 'text-blue-700', bg: 'bg-blue-50', icon: '💰' },
    { label: '達成率', value: `${summary.achievementRate.toFixed(1)}%`, color: summary.achievementRate >= 80 ? 'text-green-700' : 'text-amber-700', bg: summary.achievementRate >= 80 ? 'bg-green-50' : 'bg-amber-50', icon: '🎯' },
    { label: '本月入帳', value: fmt(summary.monthlyReceived), color: 'text-emerald-700', bg: 'bg-emerald-50', icon: '✅' },
    { label: '未入帳金額', value: fmt(summary.monthlyUnreceived), color: 'text-red-700', bg: 'bg-red-50', icon: '⏳' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`${c.bg} rounded-xl p-5 border border-slate-100`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{c.icon}</span>
            <span className="text-sm text-slate-500 font-medium">{c.label}</span>
          </div>
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          {c.label === '累計成交金額' && (
            <p className="text-xs text-slate-400 mt-1">月目標 {fmt(summary.target)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
