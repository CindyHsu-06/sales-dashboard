import { useState } from 'react';
import type { FunnelData } from '../types';

interface CustomerFunnelProps {
  data: FunnelData[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(n);

const stageDescriptions: Record<string, string> = {
  '新接觸': '先前未曾詢價過的公司',
  '已報價': '已提供報價單的客戶',
  '成交': '已簽核完成的訂單（含已入帳與未入帳）',
  '未採購': '報價後確認不採購的客戶',
};

const stageColors: Record<string, { text: string; gradient: string }> = {
  '新接觸': { text: 'text-blue-600', gradient: 'from-blue-400 to-blue-600' },
  '已報價': { text: 'text-cyan-600', gradient: 'from-cyan-400 to-cyan-600' },
  '成交': { text: 'text-emerald-600', gradient: 'from-emerald-400 to-emerald-600' },
  '未採購': { text: 'text-red-500', gradient: 'from-red-300 to-red-500' },
};

const FUNNEL_STAGES = ['新接觸', '已報價', '成交'] as const;

export default function CustomerFunnel({ data }: CustomerFunnelProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const byStage = Object.fromEntries(data.map((d) => [d.stage, d]));

  const stages = FUNNEL_STAGES.map((stage) => ({
    stage,
    count: byStage[stage]?.count ?? 0,
    amount: byStage[stage]?.amount ?? 0,
  }));

  const notPurchased = byStage['未採購'] ?? { stage: '未採購', count: 0, amount: 0 };
  const quotedStage = stages.find((s) => s.stage === '已報價');
  const total = quotedStage?.count ?? stages[0]?.count ?? 1;

  // Width: 已報價 = 100%, all others scale proportionally, min 30%
  const maxCount = Math.max(...stages.map((s) => s.count), notPurchased.count, 1);
  const widths = stages.map((s) => Math.max((s.count / maxCount) * 100, 30));

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-slate-800">客戶漏斗</h3>
        <span className="text-sm text-slate-500">
          總計 <span className="font-bold text-slate-800 text-lg">{total}</span> 家
        </span>
      </div>

      <div className="flex flex-col items-center gap-0">
        {stages.map((s, i) => {
          const colors = stageColors[s.stage];
          const width = widths[i];
          const nextStage = stages[i + 1];
          const conversionRate = nextStage && s.count > 0
            ? ((nextStage.count / s.count) * 100).toFixed(0)
            : null;

          return (
            <div key={s.stage} className="w-full flex flex-col items-center">
              <div
                className="relative cursor-pointer transition-all duration-300"
                style={{ width: `${width}%` }}
                onMouseEnter={() => setHovered(s.stage)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className={`
                    h-11 bg-gradient-to-r ${colors.gradient} rounded-lg
                    flex items-center justify-between px-4
                    ${hovered === s.stage ? 'brightness-110 shadow-md' : ''}
                    transition-all duration-200
                  `}
                >
                  <span className="text-white font-semibold text-sm whitespace-nowrap">{s.stage}</span>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-white/80 text-xs">{fmt(s.amount)}</span>
                    <span className="text-white font-bold text-lg">{s.count}</span>
                  </div>
                </div>

                {hovered === s.stage && (
                  <div className="absolute left-1/2 -translate-x-1/2 -top-16 bg-slate-800 text-white text-xs rounded-lg px-4 py-2.5 shadow-xl z-10 whitespace-nowrap">
                    <p className="font-semibold mb-0.5">{s.stage}</p>
                    <p className="text-slate-300 text-[11px] mb-1">{stageDescriptions[s.stage]}</p>
                    <p>{s.count} 家 ｜ 總金額 {fmt(s.amount)}</p>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800" />
                  </div>
                )}
              </div>

              {conversionRate !== null && (
                <div className="flex items-center gap-2 py-1.5 text-xs text-slate-500">
                  <div className="w-px h-3 bg-slate-300" />
                  <span className={`font-semibold ${stageColors[nextStage!.stage].text}`}>
                    ↓ {conversionRate}% 轉換率
                  </span>
                  <div className="w-px h-3 bg-slate-300" />
                </div>
              )}
            </div>
          );
        })}

        {/* 未採購 */}
        {notPurchased.count > 0 && (
          <div className="w-full mt-4 pt-3 border-t border-dashed border-slate-200">
            <div
              className="relative mx-auto cursor-pointer"
              style={{ width: `${Math.max((notPurchased.count / maxCount) * 100, 30)}%` }}
              onMouseEnter={() => setHovered('未採購')}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className={`
                  h-9 bg-gradient-to-r ${stageColors['未採購'].gradient} rounded-lg
                  flex items-center justify-between px-4 opacity-70
                  ${hovered === '未採購' ? 'brightness-110 opacity-100 shadow-md' : ''}
                  transition-all duration-200
                `}
              >
                <span className="text-white font-semibold text-sm whitespace-nowrap">未採購</span>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-white/80 text-xs">{fmt(notPurchased.amount)}</span>
                  <span className="text-white font-bold text-base">{notPurchased.count}</span>
                </div>
              </div>

              {hovered === '未採購' && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-14 bg-slate-800 text-white text-xs rounded-lg px-4 py-2.5 shadow-xl z-10 whitespace-nowrap">
                  <p className="font-semibold mb-0.5">未採購</p>
                  <p className="text-slate-300 text-[11px] mb-1">{stageDescriptions['未採購']}</p>
                  <p>{notPurchased.count} 家 ｜ 總金額 {fmt(notPurchased.amount)}</p>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
