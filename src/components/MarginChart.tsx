import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Percent } from 'lucide-react';
import type { Order } from '../types';

interface MarginChartProps {
  orders: Order[];
}

const BRAND = '#5b5ff0';
const LOW = '#ef4444';

export default function MarginChart({ orders }: MarginChartProps) {
  const data = orders.map((o) => ({
    name: o.companyName,
    margin: +(o.grossMargin * 100).toFixed(1),
  }));

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <Percent className="w-[18px] h-[18px] text-brand-500" />
          毛利率分佈
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND }} />≥ 8%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: LOW }} />低於 8%</span>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-slate-400 text-sm py-16 text-center">此區間無資料</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 28, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} angle={-20} textAnchor="end" height={60} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v: number) => `${v}%`} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [`${value}%`, '毛利率']}
              cursor={{ fill: '#eef0ff' }}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <ReferenceLine y={8} stroke={LOW} strokeDasharray="4 4" label={{ value: '8%', position: 'right', fill: LOW, fontSize: 12 }} />
            <Bar dataKey="margin" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.margin < 8 ? LOW : BRAND} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
