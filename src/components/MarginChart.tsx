import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Order } from '../types';

interface MarginChartProps {
  orders: Order[];
}

export default function MarginChart({ orders }: MarginChartProps) {
  const data = orders.map((o) => ({
    name: o.companyName,
    margin: +(o.grossMargin * 100).toFixed(1),
  }));

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <h3 className="text-base font-semibold text-slate-800 mb-4">毛利率分佈</h3>
      {data.length === 0 ? (
        <p className="text-slate-400 text-sm">本月無資料</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip formatter={(value: number) => [`${value}%`, '毛利率']} />
            <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '8%', position: 'right', fill: '#ef4444', fontSize: 12 }} />
            <Bar dataKey="margin" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.margin < 8 ? '#ef4444' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
