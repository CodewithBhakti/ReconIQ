import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import type { ActivePage } from './components/Navigation';
import { OverviewView } from './pages/OverviewView';
import { TransactionsView } from './pages/TransactionsView';
import { CustomersView } from './pages/CustomersView';
import { RevenueAnalyticsView } from './pages/RevenueAnalyticsView';
import { DataSourcesView } from './pages/DataSourcesView';
import { ReconciliationRulesView } from './pages/ReconciliationRulesView';
import { AuditLogsView } from './pages/AuditLogsView';
import { SettingsView } from './pages/SettingsView';
import { fetchDashboard, runReconciliation } from './api/client';
import type { DashboardData } from './api/client';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export function App() {
  const [activePage, setActivePage] = useState<ActivePage>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setNotification({
        type: 'error',
        message: `Failed to connect to backend: ${err.message}. Ensure backend is running.`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleRunReconciliation = async () => {
    setIsRunning(true);
    setNotification(null);
    try {
      const summary = await runReconciliation();
      setNotification({
        type: 'success',
        message: `Reconciliation ${summary.run_id} completed successfully in ${summary.duration_seconds.toFixed(2)}s! Reconciled $${summary.total_usd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} across ${summary.reconciled_transactions.toLocaleString()} transactions.`
      });
      // Refresh dashboard
      await loadDashboard();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Reconciliation execution failed: ${err.message}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-ivory min-h-screen text-slate-800">
      {/* Navigation Layout */}
      <Navigation
        activePage={activePage}
        setActivePage={setActivePage}
        onRunReconciliation={handleRunReconciliation}
        isRunning={isRunning}
        lastRunTime={dashboardData?.summary.timestamp}
        exceptionCount={
          dashboardData 
            ? dashboardData.summary.inactive_user_transactions + dashboardData.summary.error_lines
            : 46101
        }
      />

      {/* Main Content Viewport */}
      <div className="pl-64">
        <main className="relative pt-14 w-full bg-ivory min-h-screen">
          <div className="flex flex-col w-full p-6 gap-6">
            {/* Live Notification Banner */}
            {notification && (
              <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                notification.type === 'success' 
                  ? 'bg-teal-light text-teal-dark border-teal/20' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  {notification.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-teal" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span>{notification.message}</span>
                </div>
                <button 
                  onClick={() => setNotification(null)}
                  className="hover:underline opacity-80"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Active View Router */}
            {activePage === 'overview' && (
              <OverviewView
                data={dashboardData}
                loading={loading}
                onRunReconciliation={handleRunReconciliation}
                isRunning={isRunning}
                onNavigateToTransactions={() => setActivePage('transactions')}
              />
            )}

            {activePage === 'transactions' && <TransactionsView />}
            {activePage === 'customers' && <CustomersView />}
            {activePage === 'analytics' && (
              <RevenueAnalyticsView data={dashboardData} loading={loading} />
            )}
            {activePage === 'datasources' && <DataSourcesView />}
            {activePage === 'rules' && <ReconciliationRulesView />}
            {activePage === 'audit' && <AuditLogsView />}
            {activePage === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
