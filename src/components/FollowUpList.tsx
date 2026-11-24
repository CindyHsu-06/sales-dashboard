import { useState } from 'react';
import { PhoneCall, User, Phone, Mail, MessageCircle, CalendarDays, Hash, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
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
  if (status.includes('階段一')) return { label: '初次跟催', style: 'bg-brand-100 text-brand-700' };
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
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <PhoneCall className="w-[18px] h-[18px] text-brand-500" />
            跟進清單
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 ml-[26px]">已報價未成交的客戶（來源：Notion）</p>
        </div>
        {loading && (
          <span className="flex items-center gap-1 text-xs text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />載入中
          </span>
        )}
        {!loading && items.length > 0 && (
          <span className="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full">
            待跟進 {items.length}
          </span>
        )}
      </div>

      {items.length === 0 && !loading ? (
        <p className="py-8 text-center text-slate-400 text-sm">目前無待跟進項目</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const badge = statusBadge(item.status);
            const days = daysSince(item.lastModified);
            const stale = days > 7;
            const isOpen = expanded[item.id];
            const hasNotes = item.notes.length > 0;

            return (
              <div
                key={item.id}
                className={`rounded-lg border ${stale ? 'border-red-200' : 'border-slate-200'} hover:border-brand-200 transition-colors`}
              >
                <div className="px-4 py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-bold text-slate-800">{item.companyName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge.style}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-700">
                      {item.contact && (
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" />{item.contact}</span>
                      )}
                      {item.phone && (
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{item.phone}</span>
                      )}
                      {item.lineId && (
                        <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-slate-400" />{item.lineId}</span>
                      )}
                      {item.email && (
                        <a href={`mailto:${item.email}`} className="flex items-center gap-1.5 hover:text-brand-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />{item.email}
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400 mt-1.5">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />進單日 {item.quoteDate}</span>
                      {item.taxId && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />統編 {item.taxId}</span>}
                    </div>

                    {hasNotes && (
                      <button
                        onClick={() => toggle(item.id)}
                        className="mt-2 text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        {isOpen ? '收合' : '展開'}跟進紀錄（{item.notes.length}）
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className={`text-right shrink-0 rounded-lg px-3 py-2 ${stale ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className="text-[11px] text-slate-400">最後異動</p>
                    <p className={`text-sm font-bold tabular-nums ${stale ? 'text-red-600' : 'text-slate-700'}`}>
                      {item.lastModified}
                    </p>
                    <p className={`text-xs ${stale ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      {days === 0 ? '今天' : `${days} 天前`}
                    </p>
                  </div>
                </div>

                {isOpen && hasNotes && (
                  <div className="px-4 pb-4">
                    <div className="ml-1 border-l-2 border-brand-200 pl-4 space-y-2">
                      {item.notes.map((note, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-slate-400 shrink-0 text-xs pt-0.5 w-20 tabular-nums">{note.date}</span>
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
