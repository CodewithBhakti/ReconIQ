import React, { useState } from 'react';
import { 
  Server, 
  Cpu, 
  Sliders 
} from 'lucide-react';
import { API_BASE, fetchHealth } from '../api/client';

export const SettingsView: React.FC = () => {
  const [ffill, setFfill] = useState<boolean>(true);
  const [tieBreaker, setTieBreaker] = useState<string>('rowid_desc');
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [testingHealth, setTestingHealth] = useState<boolean>(false);

  const testConnection = async () => {
    setTestingHealth(true);
    try {
      const res = await fetchHealth();
      setHealthStatus(`Connected: ${res.service} (v${res.version}) - Status: ${res.status}`);
    } catch (err: any) {
      setHealthStatus(`Connection failed: ${err.message}`);
    } finally {
      setTestingHealth(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Banner */}
      <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl text-navy font-bold tracking-tight">System &amp; Engine Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure algorithmic pipeline parameters, API endpoints, and ledger execution controls.
          </p>
        </div>
        <span className="px-3 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
          Engine Build: v4.2.1-PROD
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pipeline Algorithmic Controls */}
        <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
            <Sliders className="w-4 h-4 text-royal" />
            <span className="text-sm font-bold text-navy">Reconciliation Engine Directives</span>
          </div>

          <div className="flex flex-col gap-4 text-xs">
            {/* Ffill toggle */}
            <div className="flex items-center justify-between p-3 bg-ivory rounded-lg border border-slate-100">
              <div className="flex flex-col">
                <span className="font-semibold text-navy">Weekend Temporal Forward-Filling (ffill)</span>
                <span className="text-slate-500 text-[11px]">
                  Roll Friday ECB closing rates forward to Saturday and Sunday
                </span>
              </div>
              <input
                type="checkbox"
                checked={ffill}
                onChange={(e) => setFfill(e.target.checked)}
                className="w-4 h-4 text-royal rounded border-slate-300 focus:ring-royal"
              />
            </div>

            {/* Tie breaker selector */}
            <div className="flex flex-col gap-1.5 p-3 bg-ivory rounded-lg border border-slate-100">
              <span className="font-semibold text-navy">Historical User Tie-Breaking Rule</span>
              <span className="text-slate-500 text-[11px]">
                Determines precedence when multiple customer records share identical updated_at timestamps
              </span>
              <select
                value={tieBreaker}
                onChange={(e) => setTieBreaker(e.target.value)}
                className="mt-2 bg-surface border border-border-subtle rounded-md p-2 text-xs text-slate-800"
              >
                <option value="rowid_desc">Latest Row Insertion (rowid DESC) — Recommended</option>
                <option value="status_active">Prefer Active Status</option>
              </select>
            </div>

            {/* Scale optimization */}
            <div className="flex items-center justify-between p-3 bg-ivory rounded-lg border border-slate-100">
              <div className="flex flex-col">
                <span className="font-semibold text-navy">Scale &amp; Vectorization Execution Mode</span>
                <span className="text-slate-500 text-[11px]">
                  Pure vectorized Pandas &amp; compiled C regular expressions
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-teal-dark">ENABLED (Fast Mode)</span>
            </div>
          </div>
        </div>

        {/* Backend & Environment Status */}
        <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
            <Server className="w-4 h-4 text-teal" />
            <span className="text-sm font-bold text-navy">Infrastructure &amp; Connectivity</span>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">API Endpoint Base:</span>
              <span className="font-mono font-bold text-royal">{API_BASE}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Audit Ledger Database:</span>
              <span className="font-mono font-semibold text-slate-700">reconiq_audit.db (SQLite 3)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Log Processing Stream:</span>
              <span className="font-mono font-semibold text-slate-700">100,001 Lines (Memory Mapped)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Frontend Environment:</span>
              <span className="font-mono font-semibold text-slate-700">React 19 + TypeScript + Vite</span>
            </div>

            <div className="pt-2">
              <button
                onClick={testConnection}
                disabled={testingHealth}
                className="w-full py-2 bg-navy text-white rounded-lg text-xs font-semibold hover:bg-navy-light flex items-center justify-center gap-2 transition-colors"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{testingHealth ? 'Testing Backend...' : 'Ping Backend Health Probe'}</span>
              </button>
              {healthStatus && (
                <p className="mt-2 text-center text-xs font-medium text-teal-dark bg-teal-light p-2 rounded border border-teal/20">
                  {healthStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
