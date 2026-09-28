import React from 'react';

const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
}) => (
  <div className="mb-6">
    {eyebrow ? (
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
        {eyebrow}
      </p>
    ) : null}

    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
      {title}
    </h1>

    {description ? (
      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    ) : null}

    {actions ? (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {actions}
      </div>
    ) : null}
  </div>
);

export default PageHeader;
