const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://reconiq-xwl0.onrender.com' : 'http://localhost:8000');

export const API_BASE = rawApiUrl.replace(/\/+$/, '');

export interface ReconciliationSummary {
  run_id: string;
  timestamp: string;
  duration_seconds: number;
  status: string;
  total_raw_lines: number;
  valid_transactions: number;
  reconciled_transactions: number;
  error_lines: number;
  malformed_lines: number;
  inactive_user_transactions: number;
  unknown_user_transactions: number;
  missing_rate_transactions: number;
  total_usd_revenue: number;
  total_eur_revenue: number;
  average_fx_rate: number;
  active_users_count: number;
  total_users_count: number;
  reconciliation_success_rate: number;
  currency_pairs_count: number;
  engine_version: string;
}

export interface MonthlyRevenue {
  month: string;
  usd_revenue: number;
  eur_revenue: number;
  transaction_count: number;
}

export interface DailyVolume {
  date: string;
  transaction_count: number;
  usd_revenue: number;
}

export interface TopCustomer {
  user_id: string;
  name: string;
  status: string;
  usd_revenue: number;
  eur_revenue: number;
  transaction_count: number;
}

export interface ProductRevenue {
  product_id: string;
  usd_revenue: number;
  eur_revenue: number;
  transaction_count: number;
}

export interface DistributionItem {
  label: string;
  count: number;
  usd_value: number;
  percentage: number;
  color: string;
}

export interface PipelineNodeHealth {
  name: string;
  status: string;
  detail: string;
  latency_ms?: number;
}

export interface TransactionRecord {
  tx_id: string;
  timestamp: string;
  date: string;
  user_id: string;
  user_name: string;
  user_status: string;
  product_id: string;
  eur_amount: number;
  fx_rate?: number;
  usd_amount?: number;
  reconciliation_status: string;
  exclusion_reason?: string;
  line_no: number;
}

export interface DashboardData {
  summary: ReconciliationSummary;
  monthly_trends: MonthlyRevenue[];
  daily_volumes: DailyVolume[];
  top_customers: TopCustomer[];
  product_revenues: ProductRevenue[];
  distribution: DistributionItem[];
  recent_transactions: TransactionRecord[];
  pipeline_health: PipelineNodeHealth[];
}

export interface TransactionListResponse {
  items: TransactionRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  filter_counts: Record<string, number>;
}

export interface CustomerListResponse {
  items: TopCustomer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogRecord {
  run_id: string;
  created_at: string;
  duration_seconds: number;
  total_input_lines: number;
  reconciled_count: number;
  excluded_count: number;
  total_usd_revenue: number;
  success_rate: number;
  status: string;
  notes?: string;
}

export interface FileValidationDetail {
  file_type: string;
  file_name: string;
  exists: boolean;
  size_bytes: number;
  valid: boolean;
  row_or_line_count: number;
  columns_or_fields: string[];
  errors: string[];
}

export interface DataSourcesStatus {
  database: FileValidationDetail;
  server_logs: FileValidationDetail;
  exchange_rates: FileValidationDetail;
  statement_pdf?: FileValidationDetail;
  student_notebook?: FileValidationDetail;
  all_valid: boolean;
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/api/dashboard`);
  if (!res.ok) throw new Error(`Failed to load dashboard: ${res.statusText}`);
  return res.json();
}

export async function fetchTransactions(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
}): Promise<TransactionListResponse> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.status) q.set('status', params.status);
  if (params.page) q.set('page', params.page.toString());
  if (params.pageSize) q.set('page_size', params.pageSize.toString());
  if (params.sortBy) q.set('sort_by', params.sortBy);
  if (params.sortDesc !== undefined) q.set('sort_desc', params.sortDesc.toString());

  const res = await fetch(`${API_BASE}/api/transactions?${q.toString()}`);
  if (!res.ok) throw new Error(`Failed to load transactions: ${res.statusText}`);
  return res.json();
}

export async function fetchCustomers(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<CustomerListResponse> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.page) q.set('page', params.page.toString());
  if (params.pageSize) q.set('page_size', params.pageSize.toString());

  const res = await fetch(`${API_BASE}/api/customers/top?${q.toString()}`);
  if (!res.ok) throw new Error(`Failed to load customers: ${res.statusText}`);
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLogRecord[]> {
  const res = await fetch(`${API_BASE}/api/audit-logs`);
  if (!res.ok) throw new Error(`Failed to load audit logs: ${res.statusText}`);
  return res.json();
}

export async function fetchDataSources(): Promise<DataSourcesStatus> {
  const res = await fetch(`${API_BASE}/api/datasources`);
  if (!res.ok) throw new Error(`Failed to load datasources: ${res.statusText}`);
  return res.json();
}

export async function runReconciliation(options?: {
  dbPath?: string;
  logsPath?: string;
  ratesPath?: string;
  ffillWeekends?: boolean;
}): Promise<ReconciliationSummary> {
  const res = await fetch(`${API_BASE}/api/reconciliation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      db_path: options?.dbPath,
      logs_path: options?.logsPath,
      rates_path: options?.ratesPath,
      ffill_weekends: options?.ffillWeekends ?? true
    })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Reconciliation failed: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadDataFile(fileType: string, file: File) {
  const formData = new FormData();
  formData.append('file_type', fileType);
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: ${res.statusText}`);
  }
  return res.json();
}

export function getExportUrl(status: string = 'All'): string {
  return `${API_BASE}/api/export/transactions?status=${encodeURIComponent(status)}`;
}
