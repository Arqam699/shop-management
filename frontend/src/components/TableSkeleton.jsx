import React from 'react';

const TableSkeleton = ({
  rows = 8,
  columns = 6,
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
    <div className="animate-pulse">
      <div className="flex gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-3 flex-1 rounded bg-slate-200"
          />
        ))}
      </div>

      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 border-b border-slate-100 px-5 py-4 last:border-0"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-3 flex-1 rounded bg-slate-100"
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default TableSkeleton;
