import { BarChart3, Target, ReceiptText, CircleCheckBig, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MonthlySummary } from '../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(n);

interface SummaryCardsProps {
  summary: MonthlySummary;
}

// Tinted block styles, as in the internal order-management tool
const tones = {
  blue: 'bg-blue-50 border-blue-200 text-blue-600',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  amber: 'bg-amber-50 border-amber-200 text-amber-600',
  red: 'bg-red-50 border-red-200 text-red-600',
  violet: 'bg-violet-50 border-violet-200 text-violet-600',
} as const;

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const reached = summary.achievementRate >= 80;
  const cards: { label: string; value: string; sub?: string; tone: keyof typeof tones; Icon: LucideIcon }[] = [
    { label: '累計成交金額', value: fmt(summary.totalDealAmount), sub: `月目標 ${fmt(summary.target)}`, tone: 'blue', Icon: BarChart3 },
    { label: '達成率', value: `${summary.achievementRate.toFixed(1)}%`, sub: `成交 / 提報金額 ${fmt(summary.target)}`, tone: reached ? 'green' : 'amber', Icon: Target },
    { label: '平均客單', value: summary.dealCount > 0 ? fmt(Math.round(summary.totalDealAmount / summary.dealCount)) : 'N/A', sub: `成交金額 / ${summary.dealCount} 筆`, tone: 'violet', Icon: ReceiptText },
    { label: '本月入帳', value: fmt(summary.monthlyReceived), tone: 'green', Icon: CircleCheckBig },
    { label: '未入帳金額', value: fmt(summary.monthlyUnreceived), tone: 'red', Icon: Clock },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-lg border px-4 py-3 ${tones[c.tone]}`}>
          <p className="text-xs font-bold mb-1.5">{c.label}</p>
          <div className="flex items-center gap-2">
            <c.Icon className="w-6 h-6 shrink-0" strokeWidth={2.2} />
            <p className="text-xl font-bold tabular-nums truncate">{c.value}</p>
          </div>
          {c.sub && <p className="text-[11px] text-slate-500 mt-1 truncate">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
