import { useState, useRef, useEffect } from 'react';

interface MonthPickerProps {
  months: string[];
  selected: string;
  onChange: (month: string) => void;
}

const MONTH_NAMES = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'];

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  return `${y} 年 ${parseInt(mo)} 月`;
};

export default function MonthPicker({ months, selected, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Derive available years and which months exist per year
  const yearMap = new Map<string, Set<string>>();
  for (const m of months) {
    const [y, mo] = m.split('-');
    if (!yearMap.has(y)) yearMap.set(y, new Set());
    yearMap.get(y)!.add(mo);
  }
  const years = [...yearMap.keys()].sort();

  const [viewYear, setViewYear] = useState(() => selected.split('-')[0]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (month: string) => {
    onChange(month);
    setOpen(false);
  };

  const canPrev = years.indexOf(viewYear) > 0;
  const canNext = years.indexOf(viewYear) < years.length - 1;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {monthLabel(selected)}
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 w-72">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => canPrev && setViewYear(years[years.indexOf(viewYear) - 1])}
              disabled={!canPrev}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-800">{viewYear} 年</span>
            <button
              onClick={() => canNext && setViewYear(years[years.indexOf(viewYear) + 1])}
              disabled={!canNext}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-2">
            {MONTH_NAMES.map((label, i) => {
              const mo = String(i + 1).padStart(2, '0');
              const key = `${viewYear}-${mo}`;
              const available = yearMap.get(viewYear)?.has(mo);
              const isSelected = key === selected;

              return (
                <button
                  key={mo}
                  disabled={!available}
                  onClick={() => handleSelect(key)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : available
                        ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                        : 'text-slate-300 cursor-not-allowed'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
