import React from 'react';
import { Calendar, CalendarRange, Filter } from 'lucide-react';

/**
 * Extracts a JavaScript Date object from varied record schemas.
 * Handles Firestore Timestamps, 'YYYY-MM-DD' string, and standard ISO dates.
 */
export function getDateFromItem(item, dateField) {
  if (!item) return null;

  let val = dateField ? item[dateField] : null;
  if (!val) {
    val = item.bookingDate || item.date || item.createdAt;
  }
  if (!val) return null;

  // Firestore Timestamp with toDate() method
  if (typeof val?.toDate === 'function') {
    return val.toDate();
  }
  // Plain Firestore Timestamp format { seconds, nanoseconds }
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  // Already a Date instance
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  // String date format
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // YYYY-MM-DD format: treat as midday local time to prevent timezone shift issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Fallback to createdAt if available
  if (item.createdAt && val !== item.createdAt) {
    if (typeof item.createdAt?.toDate === 'function') return item.createdAt.toDate();
    if (typeof item.createdAt?.seconds === 'number') return new Date(item.createdAt.seconds * 1000);
  }

  return null;
}

/**
 * Filter an array of items by the selected time period.
 * Periods supported: 'today' | 'week' | 'month' | 'custom'
 */
export function filterDataByTime(dataArray, dateField, timeFilter = 'today', customDate = { start: '', end: '' }) {
  if (!Array.isArray(dataArray)) return [];

  const now = new Date();
  let startRange = new Date();
  let endRange = new Date();

  if (timeFilter === 'today') {
    // 00:00:00 s/d 23:59:59.999 hari ini
    startRange = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    endRange = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (timeFilter === 'week') {
    // Senin s/d Minggu
    const day = now.getDay(); // 0 is Sunday, 1 is Monday ...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startRange = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
    endRange = new Date(startRange.getFullYear(), startRange.getMonth(), startRange.getDate() + 6, 23, 59, 59, 999);
  } else if (timeFilter === 'month') {
    // Tanggal 1 s/d hari terakhir bulan ini
    startRange = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endRange = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (timeFilter === 'custom') {
    if (!customDate?.start && !customDate?.end) {
      return dataArray;
    }
    if (customDate?.start) {
      const [sy, sm, sd] = customDate.start.split('-').map(Number);
      startRange = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    } else {
      startRange = new Date(2000, 0, 1, 0, 0, 0, 0);
    }
    if (customDate?.end) {
      const [ey, em, ed] = customDate.end.split('-').map(Number);
      endRange = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    } else {
      endRange = new Date(2099, 11, 31, 23, 59, 59, 999);
    }
  } else {
    return dataArray;
  }

  const startMs = startRange.getTime();
  const endMs = endRange.getTime();

  return dataArray.filter((item) => {
    const itemDate = getDateFromItem(item, dateField);
    if (!itemDate) return false;
    const ms = itemDate.getTime();
    return ms >= startMs && ms <= endMs;
  });
}

/**
 * Formats a user-friendly label for current active date range
 */
export function getActiveDateRangeLabel(timeFilter, customDate) {
  const now = new Date();
  const options = { day: 'numeric', month: 'short', year: 'numeric' };

  if (timeFilter === 'today') {
    return `Hari ini: ${now.toLocaleDateString('id-ID', options)}`;
  }

  if (timeFilter === 'week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return `${monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('id-ID', options)}`;
  }

  if (timeFilter === 'month') {
    return now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }

  if (timeFilter === 'custom') {
    if (customDate?.start && customDate?.end) {
      return `${customDate.start} s/d ${customDate.end}`;
    }
    if (customDate?.start) return `Mulai ${customDate.start}`;
    if (customDate?.end) return `Sampai ${customDate.end}`;
    return 'Pilih rentang tanggal';
  }

  return '';
}

/**
 * Date Range Filter UI Component
 */
export default function DateRangeFilter({
  timeFilter,
  setTimeFilter,
  customDate,
  setCustomDate,
  className = ''
}) {
  const filterOptions = [
    { id: 'today', label: 'Hari Ini' },
    { id: 'week', label: 'Minggu Ini' },
    { id: 'month', label: 'Bulan Ini' },
    { id: 'custom', label: 'Kustom' },
  ];

  return (
    <div className={`bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-gray-200 transition-all ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: Filter Label & Active Range Summary */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Periode Analitik</span>
              <span className="text-[10px] text-gray-400 font-medium">({getActiveDateRangeLabel(timeFilter, customDate)})</span>
            </div>
            <p className="text-[11px] text-gray-500">Sesuaikan rentang waktu untuk filter metrik keuangan &amp; booking.</p>
          </div>
        </div>

        {/* Right: Pill Buttons & Custom Date Range Inputs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          {/* Segmented Control iOS Style */}
          <div className="bg-slate-100 p-1 rounded-xl inline-flex w-full sm:w-auto overflow-x-auto gap-1 border border-slate-200/60">
            {filterOptions.map((opt) => {
              const isActive = timeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTimeFilter(opt.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer select-none font-bold text-center shrink-0 ${
                    isActive
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent font-semibold'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers (Shown when timeFilter === 'custom') */}
          {timeFilter === 'custom' && (
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 animate-fade-in shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div className="flex items-center space-x-1.5 text-xs">
                <input
                  type="date"
                  value={customDate.start || ''}
                  onChange={(e) => setCustomDate((prev) => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent text-xs font-semibold text-[#333333] focus:outline-none cursor-pointer"
                  placeholder="Mulai"
                />
                <span className="text-gray-400 font-bold text-[10px]">s/d</span>
                <input
                  type="date"
                  value={customDate.end || ''}
                  onChange={(e) => setCustomDate((prev) => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent text-xs font-semibold text-[#333333] focus:outline-none cursor-pointer"
                  placeholder="Sampai"
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
