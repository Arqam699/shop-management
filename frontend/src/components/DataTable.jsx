import React from 'react';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';

const DataTable = ({
  columns,
  rows,
  loading = false,
  page,
  pageSize,
  onPageChange,
  emptyIcon,
  emptyTitle = 'No records found',
  emptyHint = '',
  skeletonRows = 8,
  rowClassName = 'hover:bg-slate-50/80 transition-colors',
  getRowClassName,
}) => {
  const totalRows = rows.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalRows / pageSize)
  );

  const safePage = Math.min(
    Math.max(page, 1),
    totalPages
  );

  const start =
    (safePage - 1) * pageSize;

  const pageRows = rows.slice(
    start,
    start + pageSize
  );

  if (loading) {
    return (
      <TableSkeleton
        rows={skeletonRows}
        columns={columns.length}
      />
    );
  }

  if (totalRows === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        hint={emptyHint}
      />
    );
  }

  const from = start + 1;

  const to = Math.min(
    start + pageSize,
    totalRows
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 font-medium">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-[9px] font-black uppercase tracking-wider text-slate-400 backdrop-blur">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={
                    column.headerClassName ||
                    'px-5 py-4'
                  }
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row, rowIndex) => (
              <tr
                key={
                  row._id ||
                  row.id ||
                  rowIndex
                }
                className={
                  getRowClassName
                    ? getRowClassName(
                        row,
                        rowIndex
                      )
                    : rowClassName
                }
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={
                      column.className ||
                      'px-5 py-3.5'
                    }
                  >
                    {column.render
                      ? column.render(
                          row,
                          rowIndex
                        )
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-bold text-slate-500">
            Showing{' '}
            <span className="font-black text-slate-700">
              {from}–{to}
            </span>{' '}
            of{' '}
            <span className="font-black text-slate-700">
              {totalRows}
            </span>{' '}
            records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() =>
                onPageChange(safePage - 1)
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-[11px] font-black text-slate-600">
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                onPageChange(safePage + 1)
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
