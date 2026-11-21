import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, CheckCircle2, Clock3, ExternalLink, Pencil, RefreshCw, Save, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';

const RemainingCash = () => {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [amounts, setAmounts] = useState({});
  const [methods, setMethods] = useState({});
  const [savingId, setSavingId] = useState('');
  const [balanceEditId, setBalanceEditId] = useState('');
  const [editedBalances, setEditedBalances] = useState({});

  const formatMoney = (value) => `${settings?.currency || 'PKR'} ${Number(value || 0).toLocaleString('en-PK')}`;

  const fetchOutstanding = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/sales?type=cash&status=unpaid');
      const rows = response.data?.data || [];
      setSales(rows);
      setAmounts((current) => Object.fromEntries(rows.map((sale) => [
        sale._id,
        current[sale._id] ?? Number(sale.remainingBalance || 0).toString(),
      ])));
      setEditedBalances((current) => Object.fromEntries(rows.map((sale) => [
        sale._id,
        current[sale._id] ?? Number(sale.remainingBalance || 0).toString(),
      ])));
      setMethods((current) => Object.fromEntries(rows.map((sale) => [sale._id, current[sale._id] || 'Cash'])));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load remaining cash sales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOutstanding(); }, [fetchOutstanding]);

  const filteredSales = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((sale) => [
      sale.saleId,
      sale.customer?.fullName,
      sale.customer?.mobileNumber,
      ...(sale.items || []).map((item) => item.product?.name),
      sale.product?.name,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [sales, query]);

  const totalRemaining = sales.reduce((sum, sale) => sum + Number(sale.remainingBalance || 0), 0);

  const receivePayment = async (sale) => {
    const amount = Number(amounts[sale._id] || 0);
    const remaining = Number(sale.remainingBalance || 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      toast.error(`Enter an amount from 0 to ${formatMoney(remaining)}.`);
      return;
    }
    const paymentMethod = String(methods[sale._id] || '').trim();
    if (!paymentMethod) {
      toast.error('Enter the payment method.');
      return;
    }

    try {
      setSavingId(sale._id);
      const response = await api.post(`/api/sales/${sale._id}/cash-payments`, { amount, paymentMethod });
      toast.success(response.data?.message || 'Cash payment recorded.');
      const paymentId = response.data?.data?.payment?._id;
      await fetchOutstanding();
      if (paymentId) navigate(`/payments?receipt=${encodeURIComponent(paymentId)}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not record this payment.');
    } finally {
      setSavingId('');
    }
  };

  const saveBalance = async (sale) => {
    const remainingBalance = Number(editedBalances[sale._id]);
    if (!Number.isFinite(remainingBalance) || remainingBalance < 0) {
      toast.error('Enter a valid remaining balance of zero or more.');
      return;
    }
    try {
      setSavingId(sale._id);
      const response = await api.put(`/api/sales/${sale._id}/cash-balance`, { remainingBalance });
      toast.success(response.data?.message || 'Remaining balance updated.');
      setBalanceEditId('');
      await fetchOutstanding();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update remaining balance.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <>
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">Cash collections</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Remaining Cash</h1>
          <p className="mt-1 text-xs font-semibold text-slate-300">Receive the balance against the original cash sale invoice.</p>
        </div>
        <Link to="/sales" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black hover:bg-white/15">
          <CheckCircle2 size={15} /> Paid Cash Sales
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-700"><Banknote size={16} /> Total cash outstanding</div>
          <p className="mt-2 text-2xl font-black text-slate-900">{formatMoney(totalRemaining)}</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-700"><Clock3 size={16} /> Unpaid cash sales</div>
          <p className="mt-2 text-2xl font-black text-slate-900">{sales.length}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-black text-slate-900">Outstanding Invoices</h2>
          <div className="flex gap-2">
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Search size={15} className="shrink-0 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Invoice, customer, phone, product" className="h-10 min-w-0 bg-transparent text-xs font-semibold outline-none" />
            </label>
            <button type="button" onClick={fetchOutstanding} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
          </div>
        </div>

        {loading ? <p className="p-10 text-center text-sm font-semibold text-slate-400">Loading outstanding cash sales…</p>
          : filteredSales.length === 0 ? <p className="p-10 text-center text-sm font-semibold text-slate-400">No remaining cash invoices found.</p>
            : <div className="divide-y divide-slate-100">
              {filteredSales.map((sale) => {
                const products = (sale.items || []).map((item) => item.product?.name).filter(Boolean);
                const itemNames = products.length ? [...new Set(products)].join(', ') : sale.product?.name || 'Sale items';
                return (
                  <article key={sale._id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">Invoice #{sale.saleId}</h3>
                        <Link to={`/invoices/${sale._id}`} title="Open invoice" className="text-indigo-600 hover:text-indigo-800"><ExternalLink size={14} /></Link>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase text-amber-700">Partial / Due</span>
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-slate-700">{sale.customer?.fullName || 'Walk-in Customer'} · {itemNames}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">Sale total {formatMoney(sale.finalTotal)} · Down payment received {formatMoney(sale.downPayment)}</p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <label className="text-[10px] font-black uppercase text-slate-500">Remaining balance
                        {balanceEditId === sale._id ? (
                          <input type="number" min="0" step="0.01" value={editedBalances[sale._id] ?? sale.remainingBalance} onChange={(event) => setEditedBalances((current) => ({ ...current, [sale._id]: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-amber-300 px-3 text-sm font-black text-slate-800 outline-none focus:border-amber-500" />
                        ) : (
                          <span className="mt-1 block text-base font-black normal-case text-rose-600">{formatMoney(sale.remainingBalance)}</span>
                        )}
                      </label>
                      <label className="text-[10px] font-black uppercase text-slate-500">Receive now
                        <input type="number" min="0.01" max={sale.remainingBalance} step="0.01" value={amounts[sale._id] ?? sale.remainingBalance} onChange={(event) => setAmounts((current) => ({ ...current, [sale._id]: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500" />
                      </label>
                      <label className="text-[10px] font-black uppercase text-slate-500">Method
                        <input value={methods[sale._id] || ''} onChange={(event) => setMethods((current) => ({ ...current, [sale._id]: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500" />
                      </label>
                      <button type="button" disabled={savingId === sale._id} onClick={() => receivePayment(sale)} className="h-10 rounded-lg bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50 sm:col-span-3">
                        {savingId === sale._id ? 'Saving…' : 'Receive Payment'}
                      </button>
                      {balanceEditId === sale._id ? (
                        <div className="flex gap-2 sm:col-span-3">
                          <button type="button" disabled={savingId === sale._id} onClick={() => saveBalance(sale)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-[11px] font-black text-white hover:bg-amber-700 disabled:opacity-50"><Save size={13} /> Save balance</button>
                          <button type="button" disabled={savingId === sale._id} onClick={() => { setBalanceEditId(''); setEditedBalances((current) => ({ ...current, [sale._id]: String(sale.remainingBalance) })); }} className="h-9 rounded-lg border border-slate-200 px-3 text-[11px] font-black text-slate-600 hover:bg-slate-50">Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setBalanceEditId(sale._id); setEditedBalances((current) => ({ ...current, [sale._id]: String(sale.remainingBalance) })); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 px-3 text-[11px] font-black text-amber-700 hover:bg-amber-50 sm:col-span-3"><Pencil size={13} /> Edit remaining balance</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>}
      </section>
    </div>
    </>
  );
};

export default RemainingCash;
