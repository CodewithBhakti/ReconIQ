import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X 
} from 'lucide-react';
import type { 
  TransactionRecord, 
  TransactionListResponse 
} from '../api/client';
import { 
  fetchTransactions, 
  getExportUrl 
} from '../api/client';

export const TransactionsView: React.FC = () => {
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchTransactions({
        search: search || undefined,
        status: status,
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
  }, [status, page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const statusBadges: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    'Reconciled': { bg: 'bg-teal-light', text: 'text-teal-dark', border: 'border-teal/20', dot: 'bg-teal' },
    'Inactive User': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    'Unknown User': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
    'Missing FX Rate': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-5 rounded-xl border border-border-subtle shadow-sm">
        <div>
          <h1 className="text-xl text-navy font-bold tracking-tight">Audit Transaction Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Forensic line-by-line inspection across 94,902 parsed log events and historical accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={getExportUrl(status)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-slate-50 text-slate-700 border border-border-subtle rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Filtered ({status})</span>
          </a>
          <a
            href={getExportUrl('All')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-royal text-white hover:bg-royal-hover rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Export Complete Ledger</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border-subtle shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by TXID, User ID, Customer Name, Product..."
            className="w-full pl-9 pr-20 py-2 bg-ivory border border-border-subtle rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-royal"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-royal text-white rounded text-xs font-semibold hover:bg-royal-hover"
          >
            Search
          </button>
        </form>

        {/* Status Segment Tabs */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-lg text-xs font-medium border border-slate-200">
          {['All', 'Reconciled', 'Inactive User', 'Unknown User', 'Missing FX Rate'].map((tab) => {
            const count = data?.filter_counts?.[tab];
            const isActive = status === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setStatus(tab);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-surface text-navy font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                <span>{tab}</span>
                {count !== undefined && (
                  <span className="ml-1 text-[10px] text-slate-400 font-normal">
                    ({count.toLocaleString()})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="bg-surface rounded-xl border border-border-subtle shadow-sm overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4">Line</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Tx ID</th>
                <th className="py-3 px-3">User ID</th>
                <th className="py-3 px-3">Customer Name</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3 text-right">EUR Amount</th>
                <th className="py-3 px-3 text-right">FX Rate</th>
                <th className="py-3 px-3 text-right">USD Revenue</th>
                <th className="py-3 px-4 text-center">Recon Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-800 divide-y divide-border-subtle/70">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-royal border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading ledger records...
                  </td>
                </tr>
              ) : data && data.items.length > 0 ? (
                data.items.map((tx) => {
                  const badge = statusBadges[tx.reconciliation_status] || statusBadges['Inactive User'];
                  return (
                    <tr key={tx.tx_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">#{tx.line_no}</td>
                      <td className="py-2.5 px-3 text-slate-600 tabular-nums">{tx.date}</td>
                      <td className="py-2.5 px-3 text-royal font-semibold tabular-nums font-mono text-[11px]">{tx.tx_id}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{tx.user_id}</td>
                      <td className="py-2.5 px-3 font-semibold text-navy">{tx.user_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{tx.product_id}</td>
                      <td className="py-2.5 px-3 text-right font-medium tabular-nums">€{tx.eur_amount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                        {tx.fx_rate ? tx.fx_rate.toFixed(4) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-navy tabular-nums">
                        {tx.usd_amount !== undefined && tx.usd_amount !== null ? `$${tx.usd_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text} border ${badge.border}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}></span>
                          {tx.reconciliation_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-1 text-slate-400 hover:text-royal rounded transition-colors"
                          title="Inspect Forensic Audit Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                    No transactions match the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-ivory border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium tabular-nums">
              Showing {data ? ((page - 1) * pageSize + 1).toLocaleString() : 0} to{' '}
              {data ? Math.min(page * pageSize, data.total).toLocaleString() : 0} of{' '}
              {data ? data.total.toLocaleString() : 0} records
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-surface border border-border-subtle rounded px-2 py-0.5 text-xs text-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-surface border border-border-subtle rounded-lg text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 font-medium flex items-center gap-1 shadow-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-semibold text-slate-600 px-2">
              Page {page} of {data?.total_pages || 1}
            </span>
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

      {/* Forensic Audit Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-navy-dark/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-navy text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Forensic Record Audit</span>
                <span className="text-xs px-2 py-0.5 rounded bg-royal text-white font-mono font-bold">
                  {selectedTx.tx_id}
                </span>
              </div>
              <button onClick={() => setSelectedTx(null)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-ivory p-3.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Source Log Line</span>
                  <span className="font-mono text-navy font-bold">#{selectedTx.line_no}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Transaction Timestamp</span>
                  <span className="tabular-nums font-medium text-navy">{selectedTx.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer User ID</span>
                  <span className="font-mono text-royal font-bold">{selectedTx.user_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer Master Name</span>
                  <span className="font-semibold text-navy">{selectedTx.user_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Account Status (Latest Window)</span>
                  <span className="font-semibold text-slate-800">{selectedTx.user_status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Product Item Code</span>
                  <span className="font-mono text-slate-800 font-semibold">{selectedTx.product_id}</span>
                </div>
              </div>

              {/* Conversion Math Box */}
              <div className="p-3.5 bg-royal-light rounded-lg border border-royal/20 flex flex-col gap-2">
                <span className="font-bold text-navy text-xs">Currency Reconciliation Formula</span>
                <div className="flex items-center justify-between text-xs">
                  <span>EUR Amount:</span>
                  <span className="font-mono font-semibold text-navy">€{selectedTx.eur_amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>EUR to USD Rate:</span>
                  <span className="font-mono font-semibold text-royal">
                    {selectedTx.fx_rate ? selectedTx.fx_rate.toFixed(4) : 'Unavailable'}
                  </span>
                </div>
                <div className="h-px bg-royal/20 my-0.5"></div>
                <div className="flex items-center justify-between text-xs font-bold text-navy">
                  <span>Reconciled USD Revenue:</span>
                  <span className="font-mono text-sm text-teal-dark">
                    ${selectedTx.usd_amount ? selectedTx.usd_amount.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              {/* Audit Status Reason */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Reconciliation Evaluation</span>
                <p className="text-xs text-navy font-semibold mt-1">
                  Status: {selectedTx.reconciliation_status}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Reason: {selectedTx.exclusion_reason || 'Record fully verified against active ledger.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-ivory border-t border-border-subtle flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 bg-navy text-white rounded-lg text-xs font-semibold hover:bg-navy-light"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
