import type { FollowUpItem, FollowUpStatus } from '../types';

interface FollowUpListProps {
  items: FollowUpItem[];
}

const statusStyle: Record<FollowUpStatus, string> = {
  '待跟進': 'bg-amber-100 text-amber-700',
  '跟進中': 'bg-blue-100 text-blue-700',
  '已回覆': 'bg-emerald-100 text-emerald-700',
  '待結案': 'bg-purple-100 text-purple-700',
};

const fmt = (n: number) => new Intl.NumberFormat('zh-TW').format(n);

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function FollowUpList({ items }: FollowUpListProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-base font-semibold text-slate-800">跟進清單</h3>
        <p className="text-xs text-slate-400 mt-0.5">已報價未成交的客戶</p>
      </div>

      {items.length === 0 ? (
        <p className="px-6 py-8 text-center text-slate-400 text-sm">本月無待跟進項目</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const days = daysUntil(item.expectedCloseDate);
            const urgent = days <= 7;
            return (
              <div key={item.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{item.companyName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[item.followUpStatus]}`}>
                        {item.followUpStatus}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      報價金額 <span className="font-medium text-slate-700">${fmt(item.quoteAmount)}</span>
                      <span className="mx-2">|</span>
                      報價日 {item.quoteDate}
                      <span className="mx-2">|</span>
                      最後聯繫 {item.lastContactDate}
                    </p>
                    {item.note && (
                      <p className="text-xs text-slate-400 mt-1">{item.note}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">預計結案</p>
                    <p className={`text-sm font-medium ${urgent ? 'text-red-600' : 'text-slate-700'}`}>
                      {item.expectedCloseDate}
                    </p>
                    <p className={`text-xs ${urgent ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {days > 0 ? `剩 ${days} 天` : days === 0 ? '今天到期' : `已逾期 ${Math.abs(days)} 天`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
