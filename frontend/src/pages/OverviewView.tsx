import React from 'react';
import { 
  TrendingUp, 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import type { DashboardData } from '../api/client';
import { getExportUrl } from '../api/client';

interface OverviewViewProps {
  data: DashboardData | null;
  loading: boolean;
  onRunReconciliation: () => void;
  isRunning: boolean;
  onNavigateToTransactions: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  loading,
  onRunReconciliation,
  isRunning,
  onNavigateToTransactions
}) => {
  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-royal border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-500 font-medium">Loading institutional ledger and analytics...</span>
      </div>
    );
  }

  const { summary, monthly_trends, top_customers, distribution, recent_transactions, pipeline_health } = data;

  const donutColors = ['#356AE6', '#16A6A1', '#EF4444', '#F59E0B'];

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Banner / View Meta Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface p-5 rounded-xl border border-border-subtle shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl text-navy font-bold tracking-tight">Financial Overview &amp; Reconciliation</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              STABLE {summary.engine_version}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Continuous ledger ingestion and audit verification across multi-currency pipelines • Run: <span className="font-mono text-slate-700">{summary.run_id}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Secondary Export Action */}
          <a
            href={getExportUrl('Reconciled')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-slate-50 text-slate-700 border border-border-subtle rounded-lg text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Audit Ledger</span>
          </a>

          {/* Period Filter Segment */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium border border-slate-200">
            <button className="px-2.5 py-1 rounded bg-surface text-royal shadow-sm font-semibold">FY2023</button>
            <button className="px-2.5 py-1 rounded text-slate-600 hover:text-navy transition-colors">Q4</button>
            <button className="px-2.5 py-1 rounded text-slate-600 hover:text-navy transition-colors">YTD</button>
            <button className="px-2.5 py-1 rounded text-slate-600 hover:text-navy flex items-center gap-1 transition-colors">
              <span>All 365 Days</span>
            </button>
          </div>

          {/* Execution CTA */}
          <button
            onClick={onRunReconciliation}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 bg-navy-dark text-white hover:bg-navy rounded-lg text-xs font-semibold transition-all shadow-sm ${
              isRunning ? 'opacity-80' : ''
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal"></span>
            </span>
            <span>{isRunning ? 'Reconciling...' : 'Run Reconciliation'}</span>
            <span className="text-[11px] text-slate-400 font-normal ml-1">
              {summary.duration_seconds.toFixed(2)}s
            </span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total USD Revenue</span>
              <div className="text-2xl text-navy font-bold tracking-tight tabular-nums">
                ${summary.total_usd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-teal-light text-teal-dark border border-teal/20 text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              Audited
            </span>
          </div>

          {/* Sparkline Area */}
          <div className="h-8 w-full flex items-end">
            <ResponsiveContainer width="100%" height={32}>
              <AreaChart data={monthly_trends}>
                <Area type="monotone" dataKey="usd_revenue" stroke="#16A6A1" fill="#16A6A1" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 bg-ivory px-2.5 py-1.5 rounded border border-slate-100 tabular-nums">
            <span>EUR {summary.total_eur_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-slate-700 font-medium">avg {summary.average_fx_rate.toFixed(4)} FX</span>
          </div>
        </div>

        {/* Card 2: Reconciled Transactions */}
        <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Reconciled Transactions</span>
              <div className="text-2xl text-navy font-bold tracking-tight tabular-nums">
                {summary.reconciled_transactions.toLocaleString()}
              </div>
            </div>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-royal-light text-royal border border-royal/20 text-xs font-semibold tabular-nums">
              of {summary.valid_transactions.toLocaleString()} valid
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Pipeline Match Ratio</span>
              <span className="font-bold text-navy tabular-nums">
                {((summary.reconciled_transactions / summary.valid_transactions) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                className="bg-teal h-full" 
                style={{ width: `${(summary.reconciled_transactions / summary.valid_transactions) * 100}%` }}
              ></div>
              <div 
                className="bg-amber-400 h-full" 
                style={{ width: `${(summary.inactive_user_transactions / summary.valid_transactions) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 bg-ivory px-2.5 py-1.5 rounded border border-slate-100 tabular-nums">
            <span className="text-teal-dark font-semibold">{summary.reconciled_transactions.toLocaleString()} Matched</span>
            <span className="text-amber-600 font-medium">{summary.inactive_user_transactions.toLocaleString()} Inactive Acct</span>
          </div>
        </div>

        {/* Card 3: Active Customers */}
        <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Active Customers</span>
              <div className="text-2xl text-navy font-bold tracking-tight tabular-nums">
                {summary.active_users_count.toLocaleString()}
              </div>
            </div>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-navy border border-slate-200 text-xs font-semibold tabular-nums">
              of {summary.total_users_count.toLocaleString()} total
            </span>
          </div>

          {/* Avatars */}
          <div className="flex items-center gap-2 py-0.5">
            <div className="flex -space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-navy text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-surface">U1</div>
              <div className="w-6 h-6 rounded-full bg-royal text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-surface">U2</div>
              <div className="w-6 h-6 rounded-full bg-teal text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-surface">U3</div>
            </div>
            <span className="text-xs text-slate-500 pl-1">Latest status window verified</span>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 bg-ivory px-2.5 py-1.5 rounded border border-slate-100 tabular-nums">
            <span className="text-teal-dark font-semibold">100% KYC Filtered</span>
            <span className="text-slate-700 font-semibold">{(summary.total_users_count - summary.active_users_count).toLocaleString()} Inactive/Pending</span>
          </div>
        </div>

        {/* Card 4: Reconciliation Success Rate */}
        <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Settlement Integrity</span>
              <div className="text-2xl text-teal font-bold tracking-tight tabular-nums">
                {summary.reconciliation_success_rate.toFixed(2)}%
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-light text-teal-dark border border-teal/20 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-teal"></span>
              Nominal
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Error Lines Filtered</span>
            <span className="text-xs text-rose-600 font-bold tabular-nums">
              {summary.error_lines.toLocaleString()} lines
            </span>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 bg-ivory px-2.5 py-1.5 rounded border border-slate-100">
            <span>Weekend FX Gaps</span>
            <span className="text-teal font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              104 days forward-filled
            </span>
          </div>
        </div>
      </div>

      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Core Charts & Ledger (8 Cols) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Main Revenue Area Chart Card */}
          <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col">
                <h2 className="text-base text-navy font-bold">Monthly USD Revenue &amp; Multi-Currency Ingestion</h2>
                <p className="text-xs text-slate-500">Settled multicurrency balances ingested via automated batch reconciler</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-navy font-semibold">
                  <span className="w-3 h-3 rounded bg-royal inline-block"></span>
                  Reconciled USD Gross
                </span>
                <span className="flex items-center gap-1.5 text-teal-dark font-semibold">
                  <span className="w-3 h-3 rounded bg-teal inline-block"></span>
                  EUR Base Volume
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="w-full h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly_trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usdGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#356AE6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#356AE6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="eurGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A6A1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#16A6A1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis 
                    tickLine={false} 
                    axisLine={{ stroke: '#E2E8F0' }} 
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any) => [
                      name === 'usd_revenue' 
                        ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : `€${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                      name === 'usd_revenue' ? 'USD Cleared' : 'EUR Ingested'
                    ]}
                    contentStyle={{ backgroundColor: '#0B1728', borderColor: '#223956', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="usd_revenue" stroke="#356AE6" strokeWidth={2.5} fillOpacity={1} fill="url(#usdGradient)" />
                  <Area type="monotone" dataKey="eur_revenue" stroke="#16A6A1" strokeWidth={2} fillOpacity={1} fill="url(#eurGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Trend & Transaction Distribution */}
          <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-base text-navy font-bold">Transaction Activity &amp; Monthly Throughput</h3>
                <span className="text-xs text-slate-500">Monthly reconciled count vs automated settlement rate</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-navy">
                  <span className="w-2.5 h-2.5 bg-royal rounded-full"></span> Monthly Transactions
                </span>
              </div>
            </div>

            <div className="h-28 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly_trends} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" hide />
                  <YAxis hide />
                  <Tooltip 
                    formatter={(val: any) => [`${Number(val).toLocaleString()} tx`, 'Transaction Count']}
                    contentStyle={{ backgroundColor: '#0B1728', borderColor: '#223956', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="transaction_count" fill="#356AE6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions Ledger Table */}
          <div className="bg-surface rounded-xl border border-border-subtle shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base text-navy font-bold">Live Transaction Stream</span>
                  <span className="text-xs text-slate-500">Real-time ledger entries parsed from server logs</span>
                </div>
              </div>
              <button
                onClick={onNavigateToTransactions}
                className="flex items-center gap-1 text-royal hover:text-navy text-xs font-bold transition-colors"
              >
                <span>View Full Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-ivory text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-border-subtle">
                  <tr>
                    <th className="py-2.5 px-4">Date / Time</th>
                    <th className="py-2.5 px-3">Tx ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-right">EUR Amount</th>
                    <th className="py-2.5 px-3 text-right">FX Rate</th>
                    <th className="py-2.5 px-3 text-right">USD Converted</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800 divide-y divide-border-subtle/70">
                  {recent_transactions.slice(0, 6).map((tx) => (
                    <tr key={tx.tx_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 text-slate-500 tabular-nums">{tx.timestamp}</td>
                      <td className="py-2.5 px-3 text-royal font-semibold tabular-nums">{tx.tx_id}</td>
                      <td className="py-2.5 px-3 font-semibold text-navy">{tx.user_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{tx.product_id}</td>
                      <td className="py-2.5 px-3 text-right font-medium tabular-nums">€{tx.eur_amount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                        {tx.fx_rate ? tx.fx_rate.toFixed(4) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-navy tabular-nums">
                        {tx.usd_amount ? `$${tx.usd_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          tx.reconciliation_status === 'Reconciled'
                            ? 'bg-teal-light text-teal-dark border border-teal/20'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${tx.reconciliation_status === 'Reconciled' ? 'bg-teal' : 'bg-amber-500'}`}></span>
                          {tx.reconciliation_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-ivory border-t border-border-subtle flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium tabular-nums">
                Showing top 6 of {summary.valid_transactions.toLocaleString()} audited stream entries
              </span>
              <button
                onClick={onNavigateToTransactions}
                className="flex items-center gap-1 text-royal hover:text-navy text-xs font-semibold"
              >
                <span>Browse all records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Institutional Breakdowns & Pipeline (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Reconciliation Health Donut Chart */}
          <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base text-navy font-bold">Ledger Categorization</h3>
              <span className="text-xs text-slate-500 font-medium">100k Lines</span>
            </div>

            <div className="flex items-center justify-center relative py-2">
              <div className="w-44 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || donutColors[index % donutColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} records`, name]}
                      contentStyle={{ backgroundColor: '#0B1728', borderColor: '#223956', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-navy tabular-nums">
                  {summary.reconciliation_success_rate.toFixed(1)}%
                </span>
                <span className="text-[10px] uppercase text-teal font-bold tracking-wider">Settled</span>
              </div>
            </div>

            {/* Metric Breakdown Legend */}
            <div className="flex flex-col gap-2 text-xs pt-1">
              {distribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-ivory rounded border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="font-medium text-navy">{item.label}</span>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="font-bold text-navy">
                      {item.usd_value > 0 ? `$${(item.usd_value / 1000000).toFixed(1)}M` : '0 USD'}
                    </span>
                    <span className="text-slate-400 ml-1.5">({item.count.toLocaleString()})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Customers Horizontal Bar Chart */}
          <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-base text-navy font-bold">Top Customers by Volume</h3>
                <span className="text-xs text-slate-500">Audited USD cleared volume</span>
              </div>
              <span className="text-xs text-royal font-semibold">Top 5</span>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              {top_customers.slice(0, 5).map((cust, idx) => {
                const maxUsd = top_customers[0]?.usd_revenue || 1;
                const pct = Math.round((cust.usd_revenue / maxUsd) * 100);
                return (
                  <div key={cust.user_id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-navy font-semibold truncate max-w-[180px]">
                        {idx + 1}. {cust.name} ({cust.user_id})
                      </span>
                      <span className="font-bold text-navy tabular-nums">
                        ${cust.usd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="bg-royal h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline Health & Diagnostic Nodes Panel */}
          <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-base text-navy font-bold">Pipeline Health</h3>
                <span className="text-xs text-slate-500">Ingestion &amp; temporal reconciliation</span>
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-teal"></span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              {pipeline_health.map((node, i) => (
                <div key={i} className="p-2.5 bg-ivory rounded-lg border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-teal"></div>
                    <div className="flex flex-col">
                      <span className="text-xs text-navy font-semibold">{node.name}</span>
                      <span className="text-[11px] text-slate-500">{node.detail}</span>
                    </div>
                  </div>
                  <span className="font-semibold text-teal-dark tabular-nums">{node.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
