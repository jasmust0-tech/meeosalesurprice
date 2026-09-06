import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

export interface DateRange {
  from?: string;
  to?: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function todayStr(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

const presets: { label: string; range: DateRange }[] = [
  { label: 'Today', range: { from: todayStr(), to: todayStr() } },
  { label: 'Yesterday', range: { from: addDays(new Date(), -1), to: addDays(new Date(), -1) } },
  {
    label: 'This Week',
    range: (() => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      return { from: addDays(start, 0), to: todayStr() };
    })(),
  },
  { label: 'All', range: {} },
];

export function DateRangeFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(value.from || '');
  const [draftTo, setDraftTo] = useState(value.to || '');

  const hasRange = !!(value.from || value.to);
  const label = hasRange
    ? `${value.from || '…'} → ${value.to || '…'}`
    : 'All dates';

  const applyCustom = () => {
    onChange({ from: draftFrom || undefined, to: draftTo || undefined });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setDraftFrom(value.from || ''); setDraftTo(value.to || ''); setOpen((o) => !o); }}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg ${
          hasRange ? 'text-purple-700 bg-purple-100 hover:bg-purple-200' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <Calendar className="w-4 h-4" />
        {label}
        {hasRange && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange({}); }}
            className="ml-0.5 p-0.5 rounded hover:bg-purple-200"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 w-72">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { onChange(p.range); setOpen(false); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    JSON.stringify(value) === JSON.stringify(p.range)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>From</span>
                <span>To</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <button
                onClick={applyCustom}
                className="w-full text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
