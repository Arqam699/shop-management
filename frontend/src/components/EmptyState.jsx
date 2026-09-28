import React from 'react';

const EmptyState = ({
  icon: Icon,
  title = 'No records found',
  hint = '',
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
    <div className="flex flex-col items-center justify-center space-y-2 p-16 text-center text-slate-400">
      {Icon ? (
        <Icon className="h-12 w-12 text-slate-300" />
      ) : null}

      <p className="text-sm font-black text-slate-700">
        {title}
      </p>

      {hint ? (
        <p className="max-w-sm text-xs text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  </div>
);

export default EmptyState;
