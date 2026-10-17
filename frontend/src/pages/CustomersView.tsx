import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  DollarSign, 
  CreditCard 
} from 'lucide-react';
import type { CustomerListResponse } from '../api/client';
import { fetchCustomers } from '../api/client';

export const CustomersView: React.FC = () => {
  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchCustomers({
        search: search || undefined,
        page: page,
        pageSize: pageSize
      });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-5 rounded-xl border border-border-subtle shadow-sm">
        <div>
          <h1 className="text-xl text-navy font-bold tracking-tight">Enterprise Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active verified institutional counterparties ranked by audited USD transaction revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded bg-teal-light text-teal-dark border border-teal/20 text-xs font-semibold">
            14,183 Active KYC Accounts
          </span>
        </div>
      </div>

      {/* Customer Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-royal-light text-royal flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total Active Base</span>
            <span className="text-xl text-navy font-bold tabular-nums">14,183 Customers</span>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-teal-light text-teal-dark flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Top Customer Cleared</span>
            <span className="text-xl text-navy font-bold tabular-nums">$40,050.99</span>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Avg Volume / Active User</span>
            <span className="text-xl text-navy font-bold tabular-nums">~$10,454.39</span>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-sm flex items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer user_id or name..."
            className="w-full pl-9 pr-20 py-2 bg-ivory border border-border-subtle rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-royal"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-royal text-white rounded text-xs font-semibold hover:bg-royal-hover"
          >
            Search
          </button>
        </form>

        <span className="text-xs text-slate-500 font-medium tabular-nums">
          {data ? data.total.toLocaleString() : 0} customers with active transactions
        </span>
      </div>

      {/* Customers Table */}
      <div className="bg-surface rounded-xl border border-border-subtle shadow-sm overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-3 text-center">Account Status</th>
                <th className="py-3 px-3 text-right">Transaction Count</th>
                <th className="py-3 px-4 text-right">Total EUR Ingested</th>
                <th className="py-3 px-4 text-right">Total USD Cleared</th>
                <th className="py-3 px-4 text-right">Avg / Transaction</th>
              </tr>
            </thead>
            <tbody className="text-slate-800 divide-y divide-border-subtle/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-royal border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading customer portfolio...
                  </td>
                </tr>
              ) : data && data.items.length > 0 ? (
                data.items.map((cust) => {
                  const avgTx = cust.transaction_count > 0 ? cust.usd_revenue / cust.transaction_count : 0;
                  return (
                    <tr key={cust.user_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-royal">{cust.user_id}</td>
                      <td className="py-3 px-4 font-semibold text-navy">{cust.name}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-light text-teal-dark border border-teal/20 text-[11px] font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-teal"></span>
                          {cust.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium tabular-nums">{cust.transaction_count} tx</td>
                      <td className="py-3 px-4 text-right font-medium tabular-nums text-slate-600">
                        €{cust.eur_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-navy text-sm">
                        ${cust.usd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums text-teal-dark">
                        ${avgTx.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-ivory border-t border-border-subtle flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium tabular-nums">
            Showing Page {page} of {data?.total_pages || 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-surface border border-border-subtle rounded-lg text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 font-medium flex items-center gap-1 shadow-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data?.total_pages || 1, p + 1))}
              disabled={!data || page >= data.total_pages}
              className="px-3 py-1 bg-surface border border-border-subtle rounded-lg text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 font-medium flex items-center gap-1 shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
