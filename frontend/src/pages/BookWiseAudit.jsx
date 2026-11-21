import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { BookOpen, Plus, RefreshCw, ReceiptText, Package, TrendingUp, Download, Search, X, Trash2, Lock } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const BookWiseAudit = () => {
  const { settings } = useSettings();
  const [books, setBooks] = useState([]);
  const [sales, setSales] = useState([]);
  const [bookName, setBookName] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [saleSearch, setSaleSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceRangeStart, setInvoiceRangeStart] = useState('');
  const [invoiceRangeEnd, setInvoiceRangeEnd] = useState('');
  const [selectedSaleIds, setSelectedSaleIds] = useState([]);
  const [assignmentBookId, setAssignmentBookId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [deletingBook, setDeletingBook] = useState(false);
  const isDeletionUnlocked = settings?.allowGlobalDeletion === true;
  const currency = settings?.currency || 'PKR';
  const money = (value) => `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const loadBooks = async () => {
    try {
      setLoading(true);
      const [booksResponse, salesResponse] = await Promise.all([
        api.get('/api/books'),
        api.get('/api/sales'),
      ]);
      const result = booksResponse?.data?.data || [];
      const allSales = salesResponse?.data?.data || [];
      setBooks(Array.isArray(result) ? result : []);
      setSales(Array.isArray(allSales) ? allSales : []);
      setSelectedBookId((current) => result.some((book) => String(book._id) === String(current)) ? current : result[0]?._id || '');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load books.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBooks(); }, []);

  const selectedBook = books.find((book) => String(book._id) === String(selectedBookId));
  const allBooksSummary = books.reduce((totals, book) => ({
    purchaseCost: totals.purchaseCost + Number(book.summary?.purchaseCost || 0),
    sellingTotal: totals.sellingTotal + Number(book.summary?.sellingTotal || 0),
    profit: totals.profit + Number(book.summary?.profit || 0),
  }), { purchaseCost: 0, sellingTotal: 0, profit: 0 });
  const filteredSales = sales.filter((sale) => {
    const term = saleSearch.trim().toLowerCase();
    if (!term) return true;
    const productNames = (sale.items?.length ? sale.items.map((item) => item.product?.name) : [sale.product?.name]).filter(Boolean).join(' ').toLowerCase();
    return String(sale.saleId || '').toLowerCase().includes(term) || productNames.includes(term);
  }).sort((a, b) => String(a.saleId || '').localeCompare(String(b.saleId || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const unassignedSalesCount = sales.filter((sale) => !sale.book?._id && !sale.book).length;
  const salesGroupedByBook = useMemo(() => {
    const groups = new Map();
    for (const sale of filteredSales) {
      const bookId = String(sale.book?._id || sale.book || '');
      const book = books.find((entry) => String(entry._id) === bookId);
      const key = bookId || '__unassigned__';
      if (!groups.has(key)) groups.set(key, { key, name: book?.name || 'Unassigned', sales: [] });
      groups.get(key).sales.push(sale);
    }
    return [...groups.values()].sort((left, right) => {
      if (left.key === '__unassigned__') return -1;
      if (right.key === '__unassigned__') return 1;
      return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredSales, books]);
  const productGroups = useMemo(() => {
    if (!selectedBook) return [];
    const groups = new Map();
    const searchTerm = invoiceSearch.trim().toLowerCase();
    const orderedSales = [...(selectedBook.sales || [])]
      .filter((sale) => !searchTerm || String(sale.invoice || '').toLowerCase().includes(searchTerm))
      .sort((a, b) => String(a.invoice).localeCompare(String(b.invoice), undefined, { numeric: true, sensitivity: 'base' }));
    for (const sale of orderedSales) {
      for (const line of sale.lines || []) {
        const key = String(line.productId || line.product?._id || line.product?.name || 'deleted');
        if (!groups.has(key)) groups.set(key, { product: line.product || {}, lines: [] });
        groups.get(key).lines.push({ ...line, invoice: sale.invoice, saleDate: sale.saleDate, paymentType: sale.paymentType });
      }
    }
    return [...groups.entries()].map(([id, group]) => {
      const orderedLines = [...group.lines].sort((a, b) =>
        String(a.invoice).localeCompare(String(b.invoice), undefined, { numeric: true, sensitivity: 'base' })
        || new Date(a.saleDate || 0) - new Date(b.saleDate || 0)
      );
      return {
        id,
        ...group,
        lines: orderedLines,
        quantity: group.lines.reduce((sum, line) => sum + line.quantity, 0),
        purchaseCost: group.lines.reduce((sum, line) => sum + line.purchaseTotal, 0),
        sellingTotal: group.lines.reduce((sum, line) => sum + line.sellingTotal, 0),
        profit: group.lines.reduce((sum, line) => sum + line.profit, 0),
      };
    });
  }, [selectedBook, invoiceSearch]);

  const exportBook = async () => {
    if (!selectedBook) return;
    const rows = [
      ['Book', 'Product', 'Invoice', 'Date', 'Sale type', 'Quantity', 'Purchase price', 'Purchase cost', 'Line amount', 'Markup profit', 'Profit'],
      ...productGroups.flatMap((group) => group.lines.map((line) => [
        selectedBook.name,
        group.product.name || 'Deleted product',
        line.invoice,
        line.saleDate ? new Date(line.saleDate).toLocaleDateString() : '',
        line.paymentType,
        line.quantity,
        line.purchasePrice,
        line.purchaseTotal,
        line.sellingTotal,
        line.markupProfit || 0,
        line.profit,
      ])),
    ];
    const xmlEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
    const columnName = (number) => {
      let name = '';
      for (let n = number + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
      return name;
    };
    const worksheetRows = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Book Audit" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
    zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${worksheetRows}</sheetData></worksheet>`);
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedBook.name.replace(/[\\/:*?"<>|]/g, '_')}_Book_Audit.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const createBook = async (event) => {
    event.preventDefault();
    const name = bookName.trim();
    if (!name) return;
    try {
      setSaving(true);
      const response = await api.post('/api/books', { name });
      const created = response?.data?.data;
      setBookName('');
      toast.success('Book added.');
      await loadBooks();
      if (created?._id) setSelectedBookId(created._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not add book.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedBook = async () => {
    if (!bookToDelete) return;
    try {
      setDeletingBook(true);
      const response = await api.delete(`/api/books/${bookToDelete._id}`);
      toast.success(response?.data?.message || 'Book deleted; its invoices were unassigned.');
      setBookToDelete(null);
      setSelectedBookId('');
      setInvoiceSearch('');
      await loadBooks();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not delete this book.');
    } finally {
      setDeletingBook(false);
    }
  };

  const toggleSaleSelection = (saleId) => {
    setSelectedSaleIds((current) => current.includes(saleId)
      ? current.filter((id) => id !== saleId)
      : [...current, saleId]);
  };

  const toggleFilteredSales = () => {
    const filteredIds = filteredSales.map((sale) => sale._id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedSaleIds.includes(id));
    setSelectedSaleIds((current) => allSelected
      ? current.filter((id) => !filteredIds.includes(id))
      : [...new Set([...current, ...filteredIds])]);
  };

  const selectInvoiceRange = () => {
    const start = invoiceRangeStart.trim();
    const end = invoiceRangeEnd.trim();
    if (!start || !end) return toast.error('Enter both the starting and ending invoice numbers.');
    const compareInvoices = (left, right) => String(left || '').localeCompare(String(right || ''), undefined, { numeric: true, sensitivity: 'base' });
    if (compareInvoices(start, end) > 0) return toast.error('Starting invoice must come before ending invoice.');

    const matchingIds = sales
      .filter((sale) => {
        const invoice = String(sale.saleId || '').trim();
        return invoice && compareInvoices(invoice, start) >= 0 && compareInvoices(invoice, end) <= 0;
      })
      .map((sale) => sale._id);
    if (!matchingIds.length) return toast.error('No invoices were found in that range.');
    setSelectedSaleIds(matchingIds);
    toast.success(`${matchingIds.length} invoice(s) in the range selected.`);
  };

  const assignSelectedSales = async () => {
    if (!selectedSaleIds.length) return toast.error('Select at least one sale.');
    if (!assignmentBookId) return toast.error('Choose a book or select Unassign from book.');
    const shouldUnassign = assignmentBookId === '__unassign__';
    try {
      setBulkSaving(true);
      await api.put('/api/sales/bulk-book', { saleIds: selectedSaleIds, bookId: shouldUnassign ? null : assignmentBookId });
      const assignedBook = books.find((book) => String(book._id) === String(assignmentBookId));
      toast.success(shouldUnassign
        ? `${selectedSaleIds.length} sale(s) unassigned from their books.`
        : `${selectedSaleIds.length} sale(s) assigned to ${assignedBook?.name || 'the selected book'}.`);
      setSelectedSaleIds([]);
      setAssignmentBookId('');
      await loadBooks();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not assign the selected sales.');
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-700"><BookOpen className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-wider">Sales register</span></div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Book-wise Audit</h1>
          <p className="mt-1 text-sm text-slate-500">Create books and review the sales, costs, and profit recorded in each one.</p>
        </div>
        <button type="button" onClick={loadBooks} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white sm:px-6">
          <h2 className="text-sm font-black">All Books Combined Totals</h2>
          <p className="mt-1 text-xs text-slate-400">Purchase cost, selling amount aur profit ka jama total.</p>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
          {[
            ['Total Purchase Cost', allBooksSummary.purchaseCost, Package, 'text-rose-600'],
            ['Total Selling Price', allBooksSummary.sellingTotal, ReceiptText, 'text-indigo-600'],
            ['Total Profit', allBooksSummary.profit, TrendingUp, 'text-emerald-600'],
          ].map(([label, value, Icon, color]) => (
            <div key={label} className="bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-slate-500"><Icon className={`h-4 w-4 ${color}`} /><p className="text-[10px] font-black uppercase tracking-wider">{label}</p></div>
              <p className={`mt-2 text-xl font-black tracking-tight sm:text-2xl ${color}`}>{money(value)}</p>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={createBook} className="premium-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
        <label className="flex-1 text-xs font-bold text-slate-700">New book name
          <input value={bookName} onChange={(event) => setBookName(event.target.value)} placeholder="e.g. Book 1" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white" />
        </label>
        <button type="submit" disabled={saving || !bookName.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Adding…' : 'Add Book'}</button>
      </form>

      {loading ? <div className="premium-card p-10 text-center text-sm font-semibold text-slate-500">Loading books…</div> : books.length === 0 ? (
        <div className="premium-card p-10 text-center"><BookOpen className="mx-auto h-9 w-9 text-indigo-300" /><h2 className="mt-3 text-lg font-black text-slate-800">No books yet</h2><p className="mt-1 text-sm text-slate-500">Add your first book above. New sales can then be assigned to it.</p></div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">{books.map((book) => <button key={book._id} type="button" onClick={() => setSelectedBookId(book._id)} className={`rounded-xl border px-4 py-2 text-sm font-black transition ${String(book._id) === String(selectedBookId) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>{book.name}</button>)}</div>
          <details open={unassignedSalesCount > 0} className="premium-card overflow-hidden">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <span><span className="block text-sm font-black text-slate-900">Assign or move old sales</span><span className="mt-1 block text-xs text-slate-500">Select multiple invoices, choose one book, then confirm once.</span></span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">{unassignedSalesCount} unassigned</span>
            </summary>
            <div className="border-t border-slate-100 p-4 sm:p-5">
              <input value={saleSearch} onChange={(event) => setSaleSearch(event.target.value)} placeholder="Search by invoice or product..." className="mb-3 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500" />
              <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <label className="min-w-36 flex-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                  From invoice
                  <input value={invoiceRangeStart} onChange={(event) => setInvoiceRangeStart(event.target.value)} placeholder="e.g. INV-100" className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-indigo-500" />
                </label>
                <label className="min-w-36 flex-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                  To invoice
                  <input value={invoiceRangeEnd} onChange={(event) => setInvoiceRangeEnd(event.target.value)} placeholder="e.g. INV-120" className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-indigo-500" />
                </label>
                <button type="button" onClick={selectInvoiceRange} disabled={bulkSaving} className="h-9 rounded-lg border border-indigo-200 bg-white px-4 text-xs font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">Select Range</button>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={filteredSales.length > 0 && filteredSales.every((sale) => selectedSaleIds.includes(sale._id))}
                    onChange={toggleFilteredSales}
                    disabled={!filteredSales.length || bulkSaving}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Select visible ({filteredSales.length})
                </label>
                <span className="text-xs font-black text-indigo-700">{selectedSaleIds.length} selected</span>
                <select
                  value={assignmentBookId}
                  onChange={(event) => setAssignmentBookId(event.target.value)}
                  disabled={bulkSaving}
                  aria-label="Book for selected sales"
                  className="h-10 min-w-44 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-60"
                >
                  <option value="">Choose a book</option>
                  <option value="__unassign__">Unassign from book</option>
                  {books.map((book) => <option key={book._id} value={book._id}>{book.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={assignSelectedSales}
                  disabled={!selectedSaleIds.length || !assignmentBookId || bulkSaving}
                  className="h-10 rounded-lg bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkSaving ? 'Updating...' : assignmentBookId === '__unassign__' ? 'Confirm Unassign' : 'Confirm Assignment'}
                </button>
                {selectedSaleIds.length > 0 && <button type="button" onClick={() => setSelectedSaleIds([])} disabled={bulkSaving} className="h-10 rounded-lg px-3 text-xs font-bold text-slate-500 hover:bg-white disabled:opacity-50">Clear</button>}
              </div>
              <div className="max-h-[520px] space-y-4 overflow-y-auto">
                {salesGroupedByBook.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No sales found.</p> : salesGroupedByBook.map((group) => (
                  <section key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
                    <header className={`sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-3 py-2.5 ${group.key === '__unassigned__' ? 'border-amber-200 bg-amber-50' : 'border-indigo-100 bg-indigo-50'}`}>
                      <div className="flex min-w-0 items-center gap-2">
                        <BookOpen className={`h-4 w-4 shrink-0 ${group.key === '__unassigned__' ? 'text-amber-700' : 'text-indigo-700'}`} />
                        <span className={`truncate text-xs font-black uppercase tracking-wide ${group.key === '__unassigned__' ? 'text-amber-800' : 'text-indigo-800'}`}>{group.name}</span>
                        {group.key === '__unassigned__' && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-black uppercase text-amber-900">Assign first</span>}
                      </div>
                      <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-slate-600">{group.sales.length} invoices</span>
                    </header>
                    <div className="space-y-2 p-2">
                      {group.sales.map((sale) => {
                        const productNames = sale.items?.length ? sale.items.map((item) => item.product?.name || 'Product').join(', ') : sale.product?.name || 'Product';
                        return <div key={sale._id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                          <input
                            type="checkbox"
                            aria-label={`Select invoice ${sale.saleId || ''}`}
                            checked={selectedSaleIds.includes(sale._id)}
                            onChange={() => toggleSaleSelection(sale._id)}
                            disabled={bulkSaving}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-xs font-black text-slate-800">Invoice {sale.saleId || '-'}</p>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500">{sale.paymentType}</span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black ${group.key === '__unassigned__' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                <BookOpen className="h-3 w-3" /> Current book: {group.name}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-slate-600">{productNames}</p>
                            <p className="mt-1 text-[10px] text-slate-400">{sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : '-'} | Qty {sale.quantity} | {money(sale.finalTotal ?? sale.totalWithMarkup)}</p>
                          </div>
                        </div>;
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </details>
          {selectedBook && <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" /><h2 className="text-xl font-black text-slate-900">{selectedBook.name}</h2></div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={exportBook} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><Download className="h-4 w-4" />Export Excel</button>
                {isDeletionUnlocked ? (
                  <button type="button" onClick={() => setBookToDelete(selectedBook)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete Book</button>
                ) : (
                  <span title="Deletion Mode is locked in Settings" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-400"><Lock className="h-4 w-4" />Delete Book</span>
                )}
              </div>
            </div>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} placeholder="Search invoice number..." aria-label="Search invoices in this book" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none focus:border-indigo-500" />
              {invoiceSearch && <button type="button" onClick={() => setInvoiceSearch('')} aria-label="Clear invoice search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['Invoices', selectedBook.summary?.invoices || 0, ReceiptText],
                ['Units sold', selectedBook.summary?.quantity || 0, Package],
                ['Total purchase cost', money(selectedBook.summary?.purchaseCost), null],
                ['Total selling amount', money(selectedBook.summary?.sellingTotal), null],
                ['Profit', money(selectedBook.summary?.profit), TrendingUp],
              ].map(([label, value, Icon]) => <div key={label} className="premium-card p-4">{Icon && <Icon className="mb-2 h-4 w-4 text-indigo-500" />}<p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-slate-900">{value}</p></div>)}
            </div>
            {productGroups.length === 0 ? <div className="premium-card p-8 text-center text-sm text-slate-500">{invoiceSearch.trim() ? `No invoices match “${invoiceSearch.trim()}”.` : 'No sales are linked to this book yet.'}</div> : <div className="space-y-4">
              {productGroups.map((group) => <section key={group.id} className="premium-card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Package className="h-4 w-4" /></div><div><h3 className="font-black text-slate-900">{group.product.name || 'Deleted product'}</h3><p className="mt-1 text-xs text-slate-500">{[group.product.brand, group.product.model, group.product.sku && `SKU ${group.product.sku}`].filter(Boolean).join(' · ') || 'Product details unavailable'}</p></div></div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs"><span><b>{group.quantity}</b> units</span><span>Cost <b>{money(group.purchaseCost)}</b></span><span>Sales <b>{money(group.sellingTotal)}</b></span><span className="text-emerald-700">Profit <b>{money(group.profit)}</b></span></div>
                </div>
                <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-white text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Sale type</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Purchase price</th><th className="px-4 py-3 text-right">Line amount</th><th className="px-4 py-3 text-right">Markup profit</th><th className="px-4 py-3 text-right">Profit</th></tr></thead><tbody>{group.lines.map((line, index) => <tr key={`${line.invoice}-${index}`} className="border-t border-slate-100"><td className="px-4 py-3 font-bold text-indigo-700">{line.invoice}</td><td className="px-4 py-3 text-slate-600">{line.saleDate ? new Date(line.saleDate).toLocaleDateString() : '—'}</td><td className="px-4 py-3 text-slate-600">{line.paymentType}</td><td className="px-4 py-3 text-right font-semibold">{line.quantity}</td><td className="px-4 py-3 text-right">{money(line.purchasePrice)}</td><td className="px-4 py-3 text-right font-black">{money(line.sellingTotal)}</td><td className="px-4 py-3 text-right font-bold text-amber-700">{line.paymentType === 'Installment' ? money(line.markupProfit) : '—'}</td><td className="px-4 py-3 text-right font-black text-emerald-700">{money(line.profit)}</td></tr>)}</tbody></table></div>
              </section>)}
            </div>}
          </>}
        </>
      )}
      <ConfirmModal
        isOpen={Boolean(bookToDelete)}
        onClose={() => { if (!deletingBook) setBookToDelete(null); }}
        onConfirm={deleteSelectedBook}
        title="Delete Book and Unassign Invoices"
        message={bookToDelete ? `Delete book “${bookToDelete.name}”? Its ${bookToDelete.summary?.invoices || 0} invoice(s) will be unassigned from books. The sales, invoices, payments, and customer records will remain unchanged.` : ''}
      />
    </div>
  );
};

export default BookWiseAudit;
