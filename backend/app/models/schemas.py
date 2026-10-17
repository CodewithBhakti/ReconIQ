from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ReconciliationRunRequest(BaseModel):
    db_path: Optional[str] = None
    logs_path: Optional[str] = None
    rates_path: Optional[str] = None
    tie_breaker: Optional[str] = "row_number_desc"  # or "max_id"
    ffill_weekends: Optional[bool] = True

class MonthlyRevenue(BaseModel):
    month: str
    usd_revenue: float
    eur_revenue: float
    transaction_count: int

class DailyVolume(BaseModel):
    date: str
    transaction_count: int
    usd_revenue: float

class TopCustomer(BaseModel):
    user_id: str
    name: str
    status: str
    usd_revenue: float
    eur_revenue: float
    transaction_count: int

class ProductRevenue(BaseModel):
    product_id: str
    usd_revenue: float
    eur_revenue: float
    transaction_count: int

class DistributionItem(BaseModel):
    label: str
    count: int
    usd_value: float
    percentage: float
    color: str

class PipelineNodeHealth(BaseModel):
    name: str
    status: str
    detail: str
    latency_ms: Optional[float] = 0.0

class ReconciliationSummary(BaseModel):
    run_id: str
    timestamp: str
    duration_seconds: float
    status: str
    total_raw_lines: int
    valid_transactions: int
    reconciled_transactions: int
    error_lines: int
    malformed_lines: int
    inactive_user_transactions: int
    unknown_user_transactions: int
    missing_rate_transactions: int
    total_usd_revenue: float
    total_eur_revenue: float
    average_fx_rate: float
    active_users_count: int
    total_users_count: int
    reconciliation_success_rate: float
    currency_pairs_count: int = 1
    engine_version: str = "v4.2.1"

class TransactionRecord(BaseModel):
    tx_id: str
    timestamp: str
    date: str
    user_id: str
    user_name: Optional[str] = "Unknown"
    user_status: Optional[str] = "Unknown"
    product_id: str
    eur_amount: float
    fx_rate: Optional[float] = None
    usd_amount: Optional[float] = None
    reconciliation_status: str
    exclusion_reason: Optional[str] = None
    line_no: int

class TransactionListResponse(BaseModel):
    items: List[TransactionRecord]
    total: int
    page: int
    page_size: int
    total_pages: int
    filter_counts: Dict[str, int]

class CustomerListResponse(BaseModel):
    items: List[TopCustomer]
    total: int
    page: int
    page_size: int
    total_pages: int

class DashboardResponse(BaseModel):
    summary: ReconciliationSummary
    monthly_trends: List[MonthlyRevenue]
    daily_volumes: List[DailyVolume]
    top_customers: List[TopCustomer]
    product_revenues: List[ProductRevenue]
    distribution: List[DistributionItem]
    recent_transactions: List[TransactionRecord]
    pipeline_health: List[PipelineNodeHealth]

class AuditLogRecord(BaseModel):
    run_id: str
    created_at: str
    duration_seconds: float
    total_input_lines: int
    reconciled_count: int
    excluded_count: int
    total_usd_revenue: float
    success_rate: float
    status: str
    notes: Optional[str] = None

class FileValidationDetail(BaseModel):
    file_type: str
    file_name: str
    exists: bool
    size_bytes: int
    valid: bool
    row_or_line_count: int
    columns_or_fields: List[str]
    errors: List[str]

class DataSourcesStatusResponse(BaseModel):
    database: FileValidationDetail
    server_logs: FileValidationDetail
    exchange_rates: FileValidationDetail
    statement_pdf: Optional[FileValidationDetail] = None
    student_notebook: Optional[FileValidationDetail] = None
    all_valid: bool
