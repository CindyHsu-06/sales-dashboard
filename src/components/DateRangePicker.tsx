import { useState, useRef, useEffect } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function displayDate(s: string) {
  const [y, m, d] = s.split('-');
  return `${y}/${parseInt(m)}/${parseInt(d)}`;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end' | null>(null);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [viewDate, setViewDate] = useState(() => {
    const [y, m] = startDate.split('-');
    return { year: parseInt(y), month: parseInt(m) - 1 };
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelecting(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  const prevMonth = () => {
    setViewDate((v) => {
      if (v.month === 0) return { year: v.year - 1, month: 11 };
      return { ...v, month: v.month - 1 };
    });
  };
  const nextMonth = () => {
    setViewDate((v) => {
      if (v.month === 11) return { year: v.year + 1, month: 0 };
      return { ...v, month: v.month + 1 };
    });
  };

  const handleDayClick = (dateStr: string) => {
    if (selecting === 'start') {
      setTempStart(dateStr);
      if (dateStr > tempEnd) setTempEnd(dateStr);
      setSelecting('end');
    } else {
      // selecting === 'end' or null (default to end)
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setSelecting('end');
      } else {
        setTempEnd(dateStr);
        onChange(tempStart, dateStr);
        setOpen(false);
        setSelecting(null);
      }
    }
  };

  const handleQuick = (label: string) => {
    const now = new Date();
    let s: Date;
    let e: Date = now;
    switch (label) {
      case 'thisMonth':
        s = new Date(now.getFullYear(), now.getMonth(), 1);
        e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        s = lm;
        e = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      }
      case 'last3Months':
        s = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'thisQuarter': {
        const q = Math.floor(now.getMonth() / 3);
        s = new Date(now.getFullYear(), q * 3, 1);
        e = new Date(now.getFullYear(), q * 3 + 3, 0);
        break;
      }
      case 'all':
        onChange('2025-11-01', '2026-12-31');
        setTempStart('2025-11-01');
        setTempEnd('2026-12-31');
        setOpen(false);
        return;
      default:
        return;
    }
    const fs = formatDate(s);
    const fe = formatDate(e);
    setTempStart(fs);
    setTempEnd(fe);
    onChange(fs, fe);
    setOpen(false);
  };

  const openPicker = (field: 'start' | 'end') => {
    setSelecting(field);
    const d = field === 'start' ? tempStart : tempEnd;
    const [y, m] = d.split('-');
    setViewDate({ year: parseInt(y), month: parseInt(m) - 1 });
    setOpen(true);
  };

  // Render calendar
  const daysInMonth = getDaysInMonth(viewDate.year, viewDate.month);
  const firstDay = getFirstDayOfWeek(viewDate.year, viewDate.month);
  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(ds);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => openPicker('start')}
          className={`flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm font-medium transition-colors shadow-sm ${
            selecting === 'start' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {displayDate(startDate)}
        </button>
        <span className="text-slate-400 text-sm">~</span>
        <button
          onClick={() => openPicker('end')}
          className={`flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm font-medium transition-colors shadow-sm ${
            selecting === 'end' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {displayDate(endDate)}
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 flex">
          {/* Quick presets */}
          <div className="border-r border-slate-100 p-3 flex flex-col gap-1 min-w-[110px]">
            <p className="text-xs text-slate-400 font-medium mb-1 px-2">快速選擇</p>
            {[
              { label: '本月', key: 'thisMonth' },
              { label: '上個月', key: 'lastMonth' },
              { label: '近三個月', key: 'last3Months' },
              { label: '本季', key: 'thisQuarter' },
              { label: '全部', key: 'all' },
            ].map((q) => (
              <button
                key={q.key}
                onClick={() => handleQuick(q.key)}
                className="text-left px-2 py-1.5 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-4 w-[300px]">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-100">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {viewDate.year} 年 {MONTH_NAMES[viewDate.month]}
              </span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-100">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-xs text-slate-400 font-medium py-1">{w}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
              {days.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} />;
                const dayNum = parseInt(d.split('-')[2]);
                const isStart = d === tempStart;
                const isEnd = d === tempEnd;
                const inRange = d >= tempStart && d <= tempEnd;

                return (
                  <button
                    key={d}
                    onClick={() => handleDayClick(d)}
                    className={`h-8 text-sm rounded-md transition-colors relative ${
                      isStart || isEnd
                        ? 'bg-blue-600 text-white font-semibold'
                        : inRange
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Selection hint */}
            <p className="text-xs text-slate-400 mt-3 text-center">
              {selecting === 'start' ? '請選擇起始日期' : '請選擇結束日期'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
