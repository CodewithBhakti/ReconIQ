import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Building2, 
  BarChart3, 
  Database, 
  Sliders, 
  AlertTriangle, 
  Settings as SettingsIcon,
  RefreshCw,
  Search,
  Calendar,
  Bell,
  Download,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { getExportUrl } from '../api/client';

export type ActivePage = 
  | 'overview' 
  | 'transactions' 
  | 'customers' 
  | 'analytics' 
  | 'datasources' 
  | 'rules' 
  | 'audit' 
  | 'settings';

interface NavigationProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  onRunReconciliation: () => void;
  isRunning: boolean;
  lastRunTime?: string;
  exceptionCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activePage,
  setActivePage,
  onRunReconciliation,
  isRunning,
  lastRunTime: _lastRunTime,
  exceptionCount = 5098
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'customers', label: 'Customers', icon: Building2 },
    { id: 'analytics', label: 'Financial Reports', icon: BarChart3 },
    { id: 'datasources', label: 'Data Sources', icon: Database },
    { id: 'rules', label: 'Reconciliation Rules', icon: Sliders, badge: 'Active', badgeColor: 'bg-teal text-white' },
    { id: 'audit', label: 'Audit & Exceptions', icon: AlertTriangle, badge: `${exceptionCount.toLocaleString()}`, badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
    { id: 'settings', label: 'System Settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Fixed Left Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-navy z-50 flex flex-col justify-between border-r border-navy-border shadow-2xl">
        <div className="flex flex-col">
          {/* Logo & Status */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-navy-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-royal flex items-center justify-center text-white font-black text-sm shadow-md shadow-royal/30">
                RQ
              </div>
              <span className="text-base text-white font-bold tracking-tight">ReconIQ</span>
            </div>
            <span className="text-[11px] font-semibold bg-navy-light text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded tracking-wider">
              PROD
            </span>
          </div>

          {/* Ledger Environment Selector */}
          <div className="px-3.5 py-3">
            <div className="w-full flex items-center justify-between p-2.5 bg-navy-dark/70 border border-navy-border/80 rounded-lg text-left">
              <div className="flex flex-col truncate">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Ledger Environment
                </span>
                <span className="text-xs text-white font-semibold truncate mt-0.5">
                  Enterprise Multi-Currency
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  EUR / USD Settlement Pipeline
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="px-4 py-1.5">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              Reconciliation Core
            </span>
          </div>

          <nav className="px-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id as ActivePage)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left w-full ${
                    isActive
                      ? 'bg-royal text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-navy-light hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="text-[13px]">{item.label}</span>
                  {item.badge && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Engine Status & Footer Profile */}
        <div className="flex flex-col border-t border-navy-border">
          <div className="p-3 bg-navy-dark/60 m-3 rounded-lg border border-navy-border/60 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Engine Status
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal"></span>
              </span>
            </div>
            <span className="text-xs text-white font-semibold">v4.2.1 • 99.98% SLA</span>
            <span className="text-[11px] text-teal font-medium">Reconciliation Engine Live</span>
          </div>

          <div className="p-3.5 border-t border-navy-border flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-navy-light text-slate-200 border border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                AL
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs text-white font-semibold truncate">Auditor Lead</span>
                <span className="text-[11px] text-slate-400 truncate">audit-ops@reconiq.io</span>
              </div>
            </div>
            <button 
              title="Sign Out" 
              className="text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Top Header Bar */}
      <header className="fixed top-0 left-64 right-0 h-14 bg-surface border-b border-border-subtle z-40 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="hover:text-slate-900 cursor-pointer">Ledger</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-navy font-semibold">Automated Settlement</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-light border border-teal/20 text-teal-dark rounded-full text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-teal"></span>
            <span>Live Production</span>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
            <input
              type="text"
              placeholder="Search transactions, users, logs... (⌘K)"
              className="w-64 pl-8 pr-3 py-1.5 bg-ivory border border-border-subtle rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-royal focus:border-royal transition-all"
            />
          </div>

          {/* Date range indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ivory border border-border-subtle rounded-lg text-xs text-slate-700 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>FY 2023 (Audited Cycle)</span>
          </div>

          {/* Notifications */}
          <button className="relative p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-surface"></span>
          </button>

          {/* Run Reconciliation Action */}
          <button
            onClick={onRunReconciliation}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 bg-royal text-white hover:bg-royal-hover rounded-lg text-xs font-semibold transition-all shadow-sm shadow-royal/20 active:scale-[0.98] ${
              isRunning ? 'opacity-80 cursor-wait' : ''
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Reconciling...' : 'Run Reconciliation'}</span>
          </button>

          {/* Export Action */}
          <a
            href={getExportUrl('Reconciled')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-surface hover:bg-slate-50 text-slate-700 border border-border-subtle rounded-lg text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </a>
        </div>
      </header>
    </>
  );
};
