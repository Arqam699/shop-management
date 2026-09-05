import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { 
  ArrowLeft, User, Phone, FileDigit, MapPin, Notebook, ShoppingBag, Layers, ShieldCheck, AlertTriangle, CheckCircle, Clock, Users
} from 'lucide-react';

const CustomerProfile = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/customers/${id}`);
        if (response.data && response.data.success) {
          setCustomer(response.data.data);
        }
      } catch (error) {
        setErrorMsg('Failed to load profile record data.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-500 text-sm font-semibold">Compiling customer profile & guarantors...</span>
      </div>
    );
  }

  if (errorMsg || !customer) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-center">
        {errorMsg || 'Customer records missing.'}
        <div className="mt-4">
          <Link to="/customers" className="text-indigo-600 hover:underline">Back to customers ledger</Link>
        </div>
      </div>
    );
  }

  const totalPurchased = customer.totalPurchased || 0;
  const outstandingBalance = customer.outstandingBalance || 0;
  const totalSalesCount = customer.sales?.length || 0;
  const hasOverdue = customer.hasOverdue || false;

  let creditStatus = {
    title: 'New Customer (No Prior History)',
    badgeColor: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: Clock,
    description: 'Yeh customer pehli baar dukan par aaya hai. Iska koi pichla karobari record nahi hai.'
  };

  if (totalSalesCount > 0) {
    if (outstandingBalance === 0) {
      creditStatus = {
        title: 'Record 100% Clean (All Dues Cleared)',
        badgeColor: 'bg-green-50 border-green-200 text-green-700',
        icon: ShieldCheck,
        description: 'MashaAllah! Is customer ne purani saari kistein aur cash deals mukammal ada kar di hain. Koi rupiyah baqi nahi hai.'
      };
    } else if (hasOverdue) {
      creditStatus = {
        title: 'High Risk (Overdue Dues Pending)',
        badgeColor: 'bg-red-50 border-red-200 text-red-700 font-black animate-pulse',
        icon: AlertTriangle,
        description: 'Khabardar! Is customer ki pichli kiston mein se kist overdue ho chuki hai. Naya samaan dene se pehle pichle dues clear karein.'
      };
    } else {
      creditStatus = {
        title: 'Active Account (Dues on Schedule)',
        badgeColor: 'bg-purple-50 border-purple-200 text-purple-700',
        icon: CheckCircle,
        description: 'Is customer ki kistein active hain aur time par jama ho rahi hain.'
      };
    }
  }

  const StatusIcon = creditStatus.icon;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      <div className="flex items-center space-x-3">
        <Link to="/customers" className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-gray-900">{customer.fullName} Profile & Credit Sheet</h2>
          <p className="text-sm text-gray-600">Review repeat purchase credibility, cash deals, and active kiston records.</p>
        </div>
      </div>

      {/* CREDIBILITY STATUS BANNER */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${creditStatus.badgeColor}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-white shadow-sm shrink-0">
            <StatusIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest block opacity-70">Credit Audit Status</span>
            <h3 className="text-lg font-black">{creditStatus.title}</h3>
            <p className="text-xs font-semibold mt-0.5 opacity-90">{creditStatus.description}</p>
          </div>
        </div>
        <div className="text-right shrink-0 bg-white/60 px-4 py-2 rounded-xl border border-current">
          <span className="text-[10px] uppercase font-bold block opacity-70">Current Outstanding</span>
          <p className="text-lg font-black">{settings.currency} {outstandingBalance.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Customer Info + DEDICATED 2 ZAMANTI CARDS */}
        <div className="space-y-6">
          
          {/* Customer Main Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-4 border-b pb-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl">
                <User className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{customer.customerId}</span>
                <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{customer.fullName}</h3>
                <p className="text-sm text-gray-500 font-semibold">S/O {customer.fatherName}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-medium text-gray-700">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="font-bold text-slate-900">{customer.mobileNumber}</span>
              </div>
              <div className="flex items-center space-x-3">
                <FileDigit className="w-4 h-4 text-gray-400" />
                <span>CNIC: {customer.cnic}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{customer.address}, {customer.city}</span>
              </div>
            </div>

            {customer.notes && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-gray-600 italic">
                * Note: {customer.notes}
              </div>
            )}
          </div>

          {/* DEDICATED ZAMANTI (GUARANTORS) CARDS (Right below customer details) */}
          <div className="bg-white border border-purple-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-purple-100 pb-2 flex items-center justify-between">
              <h4 className="font-black text-purple-950 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Zamanatdaar (Zamanti Records)</span>
              </h4>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">2 Zamanti</span>
            </div>

            {/* Zamanti #1 Info */}
            <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-100 space-y-1.5 text-xs">
              <div className="flex justify-between items-start">
                <span className="text-[9px] uppercase font-bold text-purple-600">Zamanti 1 (Primary)</span>
                {customer.guarantor1?.relation && (
                  <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-2 py-0.2 rounded">
                    Rishta: {customer.guarantor1.relation}
                  </span>
                )}
              </div>
              <p className="font-black text-slate-900 text-sm">{customer.guarantor1?.name || 'No Zamanti 1 added'}</p>
              {customer.guarantor1?.fatherName && <p className="text-[11px] text-gray-500">S/O {customer.guarantor1.fatherName}</p>}
              {customer.guarantor1?.mobileNumber && <p className="text-slate-700 font-bold">Mob: {customer.guarantor1.mobileNumber}</p>}
              {customer.guarantor1?.cnic && <p className="text-gray-500 text-[10px]">CNIC: {customer.guarantor1.cnic}</p>}
              {customer.guarantor1?.address && <p className="text-gray-500 text-[10px]">Pata: {customer.guarantor1.address}</p>}
            </div>

            {/* Zamanti #2 Info */}
            <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-1.5 text-xs">
              <div className="flex justify-between items-start">
                <span className="text-[9px] uppercase font-bold text-indigo-600">Zamanti 2 (Secondary)</span>
                {customer.guarantor2?.relation && (
                  <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.2 rounded">
                    Rishta: {customer.guarantor2.relation}
                  </span>
                )}
              </div>
              <p className="font-black text-slate-900 text-sm">{customer.guarantor2?.name || 'No Zamanti 2 added'}</p>
              {customer.guarantor2?.fatherName && <p className="text-[11px] text-gray-500">S/O {customer.guarantor2.fatherName}</p>}
              {customer.guarantor2?.mobileNumber && <p className="text-slate-700 font-bold">Mob: {customer.guarantor2.mobileNumber}</p>}
              {customer.guarantor2?.cnic && <p className="text-gray-500 text-[10px]">CNIC: {customer.guarantor2.cnic}</p>}
              {customer.guarantor2?.address && <p className="text-gray-500 text-[10px]">Pata: {customer.guarantor2.address}</p>}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Ledger & Past Purchases */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Summary Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Items Purchased</span>
              <p className="text-xl font-extrabold text-gray-900 mt-1">{totalSalesCount} Deals</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Lifetime Bill</span>
              <p className="text-xl font-extrabold text-gray-900 mt-1">{settings.currency} {totalPurchased.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm col-span-2 md:col-span-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Remaining Dues Balance</span>
              <p className="text-xl font-extrabold text-red-600 mt-1">{settings.currency} {outstandingBalance.toLocaleString()}</p>
            </div>
          </div>

          {/* DEDICATED SECTION: PAST PURCHASES & CLEARANCE CHECK LEDGER */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b pb-3 flex justify-between items-center">
              <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>Past Purchases History & Clearance Ledger</span>
              </h4>
              <span className="text-[10px] font-bold text-gray-400">Total: {totalSalesCount} Deals Logged</span>
            </div>
            
            {customer.sales && customer.sales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-600 font-medium">
                  <thead className="bg-gray-50 border-b border-gray-200 uppercase font-bold text-gray-500 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3 text-right">Deal Price</th>
                      <th className="px-4 py-3 text-right">Dues Left</th>
                      <th className="px-4 py-3 text-center">Record Status</th>
                      <th className="px-4 py-3">Purchase Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customer.sales.map((sale) => {
                      const isCash = sale.paymentType === 'Cash';
                      const isCleared = isCash || sale.remainingBalance === 0;

                      return (
                        <tr key={sale._id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{sale.product?.name || 'Deleted Product'}</p>
                            <p className="text-[10px] text-gray-400">{sale.product?.brand} {sale.product?.model}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isCash ? 'bg-green-50 border-green-200 text-green-700' : 'bg-purple-50 border-purple-200 text-purple-700'
                            }`}>
                              {isCash ? 'Cash Deal' : `${sale.installmentDuration}M Installments`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{settings.currency} {sale.finalTotal.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">
                            {isCleared ? '0' : `${settings.currency} ${(sale.remainingBalance || 0).toLocaleString()}`}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isCleared ? (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold text-[9px]">
                                100% Cleared
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[9px]">
                                Dues Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-[10px]">
                            {new Date(sale.saleDate).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No registered purchase invoices recorded for this buyer yet.</p>
            )}
          </div>

          {/* ACTIVE INSTALLMENT PLANS PROGRESS SECTION */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center space-x-2 border-b pb-3">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Active Installment Plans Schedule Status</span>
            </h4>
            
            {customer.installmentPlans && customer.installmentPlans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-600 font-medium">
                  <thead className="bg-gray-50 border-b border-gray-200 uppercase font-bold text-gray-500 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Plan ID</th>
                      <th className="px-4 py-3">Product Financed</th>
                      <th className="px-4 py-3 text-right">Total Financed</th>
                      <th className="px-4 py-3 text-right">Dues Remaining</th>
                      <th className="px-4 py-3 text-center">Schedules Left</th>
                      <th className="px-4 py-3 text-center">Plan Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customer.installmentPlans.map((plan) => (
                      <tr key={plan._id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-bold text-indigo-600">{plan.planId}</td>
                        <td className="px-4 py-3 text-gray-900 font-bold">{plan.product?.name || 'Deleted Item'}</td>
                        <td className="px-4 py-3 text-right">{settings.currency} {(plan.totalAmount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black text-red-600">{settings.currency} {(plan.remainingBalance || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          {plan.unpaidCount === 0 ? (
                            <span className="text-green-600 font-bold">All Dues Cleared!</span>
                          ) : (
                            <span className="font-bold">{plan.unpaidCount} / {plan.totalInstallmentsCount} Left</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${
                            plan.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700' :
                            plan.status === 'Overdue' ? 'bg-red-50 border-red-200 text-red-700 animate-pulse' :
                            'bg-blue-50 border-blue-200 text-blue-700'
                          }`}>
                            {plan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No active installment plans detected for this customer.</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default CustomerProfile;