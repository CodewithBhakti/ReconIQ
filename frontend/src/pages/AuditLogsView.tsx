import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Eye, 
  X, 
  CheckCircle2 
} from 'lucide-react';
import type { AuditLogRecord } from '../api/client';
import { fetchAuditLogs } from '../api/client';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-5 rounded-xl border border-border-subtle shadow-sm">
        <div>
          <h1 className="text-xl text-navy font-bold tracking-tight">Audit Trail &amp; Run History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable SQLite forensic logs documenting every batch execution, duration, input lines, and settlement outcomes.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-slate-50 text-slate-700 border border-border-subtle rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Run History</span>
        </button>
      </div>

      {/* Main Audit Logs Table */}
      <div className="bg-surface rounded-xl border border-border-subtle shadow-sm overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4">Run Identifier</th>
                <th className="py-3 px-4">Execution Time (UTC)</th>
                <th className="py-3 px-3 text-right">Duration</th>
                <th className="py-3 px-3 text-right">Input Records</th>
                <th className="py-3 px-3 text-right">Reconciled</th>
                <th className="py-3 px-3 text-right">Exceptions</th>
                <th className="py-3 px-4 text-right">USD Cleared</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="text-slate-800 divide-y divide-border-subtle/70">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-royal border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.run_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-royal">{log.run_id}</td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">{log.created_at}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">{log.duration_seconds.toFixed(3)}s</td>
                    <td className="py-3 px-3 text-right font-medium tabular-nums">{log.total_input_lines.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-bold text-teal-dark tabular-nums">{log.reconciled_count.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-medium text-amber-600 tabular-nums">{log.excluded_count.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-navy tabular-nums">
                      ${log.total_usd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-light text-teal-dark border border-teal/20 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-teal" />
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-slate-400 hover:text-royal transition-colors"
                        title="View Execution Log Breakdown"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No reconciliation runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-navy-dark/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-navy text-white flex items-center justify-between">
              <span className="text-xs font-bold font-mono">{selectedLog.run_id}</span>
              <button onClick={() => setSelectedLog(null)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Run ID:</span>
                <span className="font-mono font-bold text-navy">{selectedLog.run_id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Timestamp:</span>
                <span className="tabular-nums font-medium text-navy">{selectedLog.created_at}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Processing Duration:</span>
                <span className="font-mono text-royal font-bold">{selectedLog.duration_seconds.toFixed(3)}s</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Input Lines:</span>
                <span className="tabular-nums font-semibold text-navy">{selectedLog.total_input_lines.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Reconciled Count:</span>
                <span className="tabular-nums font-bold text-teal-dark">{selectedLog.reconciled_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Excluded (Inactive/Errors):</span>
                <span className="tabular-nums font-semibold text-amber-600">{selectedLog.excluded_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total USD Cleared:</span>
                <span className="tabular-nums font-bold text-navy text-sm">
                  ${selectedLog.total_usd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Notes:</span>
                <span className="font-medium text-slate-700">{selectedLog.notes || 'None'}</span>
              </div>
            </div>
            <div className="p-3.5 bg-ivory border-t border-border-subtle flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-navy text-white rounded-lg text-xs font-semibold hover:bg-navy-light"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
