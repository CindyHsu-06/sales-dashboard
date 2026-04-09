import type { FunnelData } from '../types';

interface CustomerFunnelProps {
  data: FunnelData[];
}

const stageColors: Record<string, string> = {
  '新接觸': 'bg-blue-400',
  '已報價': 'bg-cyan-400',
  '跟進中': 'bg-amber-400',
  '成交': 'bg-emerald-400',
  '未採購': 'bg-red-400',
};

export default function CustomerFunnel({ data }: CustomerFunnelProps) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-800">客戶漏斗</h3>
        <span className="text-sm text-slate-500">總計 <span className="font-bold text-slate-800 text-lg">{total}</span> 家</span>
      </div>
      <div className="space-y-3">
        {data.map((d) => {
          const pct = (d.count / max) * 100;
          return (
            <div key={d.stage} className="flex items-center gap-3">
              <span className="w-16 text-sm text-slate-600 text-right shrink-0">{d.stage}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                <div
                  className={`h-full rounded-full ${stageColors[d.stage]} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-700">
                  {d.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
