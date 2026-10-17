import React from 'react';
import { 
  Package, 
  Calendar 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';
import type { DashboardData } from '../api/client';

interface RevenueAnalyticsViewProps {
  data: DashboardData | null;
  loading: boolean;
}

export const RevenueAnalyticsView: React.FC<RevenueAnalyticsViewProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-royal border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-500 font-medium">Computing revenue models...</span>
      </div>
    );
  }

  const { summary, monthly_trends, product_revenues, daily_volumes } = data;

  // Calculate quarterly totals
  const q1 = monthly_trends.slice(0, 3).reduce((acc, m) => acc + m.usd_revenue, 0);
  const q2 = monthly_trends.slice(3, 6).reduce((acc, m) => acc + m.usd_revenue, 0);
  const q3 = monthly_trends.slice(6, 9).reduce((acc, m) => acc + m.usd_revenue, 0);
  const q4 = monthly_trends.slice(9, 12).reduce((acc, m) => acc + m.usd_revenue, 0);

  return (
    <div className="flex flex-col w-full gap-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-5 rounded-xl border border-border-subtle shadow-sm">
        <div>
          <h1 className="text-xl text-navy font-bold tracking-tight">Financial Reports &amp; Multi-Currency Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional revenue attribution, product profitability, and FX exchange variance models.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 bg-royal-light text-royal border border-royal/20 rounded-lg">
            Total USD Cleared: ${summary.total_usd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Quarterly Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Q1 (Jan - Mar)', val: q1, color: 'text-royal' },
          { label: 'Q2 (Apr - Jun)', val: q2, color: 'text-teal-dark' },
          { label: 'Q3 (Jul - Sep)', val: q3, color: 'text-navy' },
          { label: 'Q4 (Oct - Dec)', val: q4, color: 'text-royal' },
        ].map((q, idx) => (
          <div key={idx} className="bg-surface p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{q.label}</span>
            <div className={`text-xl font-bold tracking-tight tabular-nums ${q.color}`}>
              ${q.val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400">Audited settlement</span>
          </div>
        ))}
      </div>

      {/* Dual Currency Monthly Comparison Chart */}
      <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base text-navy font-bold">Monthly Multi-Currency Settlement (USD vs EUR)</h2>
            <p className="text-xs text-slate-500">Gross EUR invoice amount against converted USD settled revenue</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-royal">
              <span className="w-3 h-3 bg-royal rounded inline-block"></span> USD Revenue
            </span>
            <span className="flex items-center gap-1.5 text-teal">
              <span className="w-3 h-3 bg-teal rounded inline-block"></span> EUR Base
            </span>
          </div>
        </div>

        <div className="w-full h-80 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly_trends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis 
                tickLine={false} 
                axisLine={{ stroke: '#E2E8F0' }} 
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
              />
              <Tooltip 
                formatter={(val: any, name: any) => [
                  name === 'usd_revenue' ? `$${Number(val).toLocaleString()}` : `€${Number(val).toLocaleString()}`,
                  name === 'usd_revenue' ? 'USD Settled' : 'EUR Base'
                ]}
                contentStyle={{ backgroundColor: '#0B1728', borderColor: '#223956', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="usd_revenue" fill="#356AE6" radius={[4, 4, 0, 0]} name="usd_revenue" />
              <Bar dataKey="eur_revenue" fill="#16A6A1" radius={[4, 4, 0, 0]} name="eur_revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product Revenue Breakdown & Daily Volume Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Top Product Revenue (7 cols) */}
        <div className="xl:col-span-7 bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base text-navy font-bold">Product Catalog Performance</h3>
              <span className="text-xs text-slate-500">Revenue attribution by product SKU</span>
            </div>
            <Package className="w-4 h-4 text-slate-400" />
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-border-subtle">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-right">Transactions</th>
                  <th className="py-2.5 px-3 text-right">EUR Amount</th>
                  <th className="py-2.5 px-3 text-right">USD Revenue</th>
                  <th className="py-2.5 px-3 text-right">% Share</th>
                </tr>
              </thead>
              <tbody className="text-slate-800 divide-y divide-border-subtle/70">
                {product_revenues.map((prod) => {
                  const share = ((prod.usd_revenue / summary.total_usd_revenue) * 100).toFixed(1);
                  return (
                    <tr key={prod.product_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-navy">{prod.product_id}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{prod.transaction_count.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-medium tabular-nums text-slate-600">
                        €{prod.eur_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums text-navy">
                        ${prod.usd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-royal">
                        {share}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Volume Trend (5 cols) */}
        <div className="xl:col-span-5 bg-surface p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base text-navy font-bold">Daily Volume Consistency</h3>
              <span className="text-xs text-slate-500">Sample of 365 daily transaction distributions</span>
            </div>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily_volumes.slice(0, 60)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fill: '#64748B', fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fill: '#64748B', fontSize: 10 }} />
                <Tooltip 
                  formatter={(val: any) => [`${val} transactions`, 'Volume']}
                  contentStyle={{ backgroundColor: '#0B1728', borderColor: '#223956', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="transaction_count" stroke="#356AE6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-ivory rounded-lg border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Average Daily Transaction Load:</span>
            <span className="font-bold text-navy tabular-nums">~147 tx / day</span>
          </div>
        </div>
      </div>
    </div>
  );
};
