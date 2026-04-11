import { useState } from 'react';
import type { FollowUpItem } from '../types';

interface FollowUpListProps {
  items: FollowUpItem[];
  loading?: boolean;
}

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

function statusBadge(status: string): { label: string; style: string } {
  if (status.includes('階段一')) return { label: '初次跟催', style: 'bg-blue-100 text-blue-700' };
  if (status.includes('階段二')) return { label: '二次跟催', style: 'bg-amber-100 text-amber-700' };
  if (status.includes('階段三')) return { label: '三次跟催', style: 'bg-red-100 text-red-700' };
  return { label: status, style: 'bg-slate-100 text-slate-700' };
}

export default function FollowUpList({ items, loading }: FollowUpListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">跟進清單</h3>
          <p className="text-xs text-slate-400 mt-0.5">已報價未成交的客戶（來源：Notion）</p>
        </div>
        {loading && (
          <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full animate-pulse">載入中...</span>
        )}
        {!loading && items.length > 0 && (
          <span className="text-sm text-slate-500">{items.length} 筆待跟進</span>
        )}
      </div>

      {items.length === 0 && !loading ? (
        <p className="px-6 py-8 text-center text-slate-400 text-sm">目前無待跟進項目</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const badge = statusBadge(item.status);
            const days = daysSince(item.lastModified);
            const stale = days > 7;
            const isOpen = expanded[item.id];
            const hasNotes = item.notes.length > 0;

            return (
              <div key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-medium text-slate-800">{item.companyName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.style}`}>
                          {badge.label}
                        </span>
                        {hasNotes && (
                          <button
                            onClick={() => toggle(item.id)}
                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5"
                          >
                            <span>{isOpen ? '收合' : '展開'}紀錄</span>
                            <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full text-[10px] font-medium ml-0.5">
                              {item.notes.length}
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>聯絡人：<span className="text-slate-700">{item.contact}</span></span>
                        <span>電話：<span className="text-slate-700">{item.phone}</span></span>
                        {item.lineId && (
                          <span>LINE：<span className="text-slate-700">{item.lineId}</span></span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                        <span>進單日：{item.quoteDate}</span>
                        <span>統編：{item.taxId}</span>
                        {item.email && <span>Email：{item.email}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-400">最後異動</p>
                      <p className={`text-sm font-medium ${stale ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.lastModified}
                      </p>
                      <p className={`text-xs ${stale ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        {days === 0 ? '今天' : `${days} 天前`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 跟進紀錄展開區 */}
                {isOpen && hasNotes && (
                  <div className="px-6 pb-4">
                    <div className="ml-2 border-l-2 border-blue-200 pl-4 space-y-2">
                      {item.notes.map((note, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-slate-400 shrink-0 text-xs pt-0.5 w-20">{note.date}</span>
                          <span className="text-slate-600">{note.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
