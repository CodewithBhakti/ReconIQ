import time
import uuid
import threading
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import pandas as pd

from app.core.config import settings
from app.pipeline.user_processor import process_historical_users
from app.pipeline.log_parser import parse_server_logs
from app.pipeline.fx_engine import process_exchange_rates
from app.pipeline.reconciler import reconcile_financial_data
from app.pipeline.analytics import compute_financial_analytics
from app.core.audit_db import record_reconciliation_run
from app.models.schemas import (
    ReconciliationSummary,
    DashboardResponse,
    TransactionRecord,
    TransactionListResponse,
    TopCustomer,
    CustomerListResponse
)

class AppStateManager:
    def __init__(self):
        self._lock = threading.Lock()
        self.is_running: bool = False
        self.last_run_id: Optional[str] = None
        self.last_run_time: Optional[str] = None
        
        # In-memory datasets
        self.df_all_tx: Optional[pd.DataFrame] = None
        self.df_reconciled: Optional[pd.DataFrame] = None
        self.df_users: Optional[pd.DataFrame] = None
        self.df_rates: Optional[pd.DataFrame] = None
        
        # Cached analytics and summaries
        self.summary: Optional[ReconciliationSummary] = None
        self.analytics_data: Optional[Dict[str, Any]] = None
        self.user_stats: Dict[str, Any] = {}
        self.log_stats: Dict[str, Any] = {}
        self.fx_stats: Dict[str, Any] = {}

    def run_pipeline(
        self,
        db_path: Optional[str] = None,
        logs_path: Optional[str] = None,
        rates_path: Optional[str] = None,
        ffill_weekends: bool = True
    ) -> ReconciliationSummary:
        """Executes the complete 4-phase reconciliation pipeline with performance measurement."""
        with self._lock:
            self.is_running = True
            start_time = time.time()
            run_id = f"RUN-{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
            
            # Resolve paths
            target_db = Path(db_path) if db_path else settings.DEFAULT_DB_PATH
            target_logs = Path(logs_path) if logs_path else settings.DEFAULT_LOGS_PATH
            target_rates = Path(rates_path) if rates_path else settings.DEFAULT_RATES_PATH
            
            try:
                # Phase 1: User Processing
                df_latest_users, df_active_users, user_stats = process_historical_users(target_db)
                self.df_users = df_latest_users
                self.user_stats = user_stats

                # Phase 2: Log Parsing
                df_valid_tx, df_log_excluded, log_stats = parse_server_logs(target_logs)
                self.log_stats = log_stats

                # Phase 3: Exchange Rates
                df_rates, fx_stats = process_exchange_rates(target_rates, ffill_weekends=ffill_weekends)
                self.df_rates = df_rates
                self.fx_stats = fx_stats

                # Phase 4: Financial Reconciliation
                df_all_tx, df_reconciled, recon_stats = reconcile_financial_data(
                    df_valid_tx, df_latest_users, df_rates, df_log_excluded
                )
                self.df_all_tx = df_all_tx
                self.df_reconciled = df_reconciled

                # Phase 5: Analytics
                analytics_data = compute_financial_analytics(df_reconciled, df_all_tx, log_stats)
                self.analytics_data = analytics_data

                duration = time.time() - start_time
                
                # Build Summary
                summary = ReconciliationSummary(
                    run_id=run_id,
                    timestamp=time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                    duration_seconds=round(duration, 3),
                    status="SUCCESS",
                    total_raw_lines=log_stats["total_lines"],
                    valid_transactions=log_stats["parsed_transactions"],
                    reconciled_transactions=recon_stats["reconciled_count"],
                    error_lines=log_stats["error_lines_filtered"],
                    malformed_lines=log_stats["malformed_lines_filtered"],
                    inactive_user_transactions=recon_stats["inactive_user_count"],
                    unknown_user_transactions=recon_stats["unknown_user_count"],
                    missing_rate_transactions=recon_stats["missing_fx_count"],
                    total_usd_revenue=recon_stats["total_usd_revenue"],
                    total_eur_revenue=recon_stats["total_eur_revenue"],
                    average_fx_rate=recon_stats["average_fx_rate"],
                    active_users_count=user_stats["active_users_count"],
                    total_users_count=user_stats["total_unique_users"],
                    reconciliation_success_rate=recon_stats["reconciliation_success_rate"]
                )

                self.summary = summary
                self.last_run_id = run_id
                self.last_run_time = summary.timestamp

                # Persist run to SQLite Audit DB
                record_reconciliation_run(
                    run_id=run_id,
                    duration_seconds=duration,
                    total_input_lines=log_stats["total_lines"],
                    reconciled_count=recon_stats["reconciled_count"],
                    excluded_count=(log_stats["total_lines"] - recon_stats["reconciled_count"]),
                    total_usd_revenue=recon_stats["total_usd_revenue"],
                    success_rate=recon_stats["reconciliation_success_rate"],
                    status="SUCCESS",
                    notes="Completed automated batch pipeline",
                    summary_data=summary.model_dump()
                )

                return summary

            finally:
                self.is_running = False

    def get_dashboard(self) -> DashboardResponse:
        """Returns the full executive dashboard view models."""
        if self.summary is None or self.df_all_tx is None:
            # Auto-run with default data if not yet executed
            self.run_pipeline()

        # Build recent transactions preview
        preview_rows = self.df_all_tx.head(10).to_dict("records")
        recent_tx = [
            TransactionRecord(
                tx_id=r["tx_id"],
                timestamp=str(r["timestamp"]),
                date=str(r["date"]),
                user_id=r["user_id"],
                user_name=r.get("user_name", "Unknown"),
                user_status=r.get("user_status", "Unknown"),
                product_id=r["product_id"],
                eur_amount=float(r["eur_amount"]),
                fx_rate=float(r["fx_rate"]) if pd.notna(r["fx_rate"]) else None,
                usd_amount=float(r["usd_amount"]) if pd.notna(r["usd_amount"]) else None,
                reconciliation_status=r["reconciliation_status"],
                exclusion_reason=r.get("exclusion_reason"),
                line_no=int(r["line_no"])
            )
            for r in preview_rows
        ]

        return DashboardResponse(
            summary=self.summary,
            monthly_trends=self.analytics_data["monthly_trends"],
            daily_volumes=self.analytics_data["daily_volumes"],
            top_customers=self.analytics_data["top_customers"],
            product_revenues=self.analytics_data["product_revenues"],
            distribution=self.analytics_data["distribution"],
            recent_transactions=recent_tx,
            pipeline_health=self.analytics_data["pipeline_health"]
        )

    def query_transactions(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 25,
        sort_by: str = "line_no",
        sort_desc: bool = False
    ) -> TransactionListResponse:
        """Searches, filters, sorts, and paginates transaction records."""
        if self.df_all_tx is None:
            self.run_pipeline()

        df = self.df_all_tx.copy()

        # Filter counts
        filter_counts = {
            "All": len(df),
            "Reconciled": int((df["reconciliation_status"] == "Reconciled").sum()),
            "Inactive User": int((df["reconciliation_status"] == "Inactive User").sum()),
            "Unknown User": int((df["reconciliation_status"] == "Unknown User").sum()),
            "Missing FX Rate": int((df["reconciliation_status"] == "Missing FX Rate").sum())
        }

        # Apply status filter
        if status and status != "All":
            df = df[df["reconciliation_status"] == status]

        # Apply search (matches tx_id, user_id, user_name, product_id)
        if search:
            s = search.strip().lower()
            df = df[
                df["tx_id"].str.lower().str.contains(s, na=False) |
                df["user_id"].str.lower().str.contains(s, na=False) |
                df["user_name"].str.lower().str.contains(s, na=False) |
                df["product_id"].str.lower().str.contains(s, na=False)
            ]

        total = len(df)
        total_pages = max(1, (total + page_size - 1) // page_size)
        page = max(1, min(page, total_pages))

        # Sorting
        if sort_by in df.columns:
            df = df.sort_values(sort_by, ascending=not sort_desc)

        # Pagination slice
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_df = df.iloc[start_idx:end_idx]

        items = [
            TransactionRecord(
                tx_id=r["tx_id"],
                timestamp=str(r["timestamp"]),
                date=str(r["date"]),
                user_id=r["user_id"],
                user_name=r.get("user_name", "Unknown"),
                user_status=r.get("user_status", "Unknown"),
                product_id=r["product_id"],
                eur_amount=float(r["eur_amount"]),
                fx_rate=float(r["fx_rate"]) if pd.notna(r["fx_rate"]) else None,
                usd_amount=float(r["usd_amount"]) if pd.notna(r["usd_amount"]) else None,
                reconciliation_status=r["reconciliation_status"],
                exclusion_reason=r.get("exclusion_reason"),
                line_no=int(r["line_no"])
            )
            for _, r in page_df.iterrows()
        ]

        return TransactionListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            filter_counts=filter_counts
        )

    def query_customers(
        self,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> CustomerListResponse:
        """Returns customer level financial aggregations."""
        if self.df_reconciled is None:
            self.run_pipeline()

        df_c = self.df_reconciled.groupby(["user_id", "user_name", "user_status"]).agg(
            usd_revenue=("usd_amount", "sum"),
            eur_revenue=("eur_amount", "sum"),
            transaction_count=("tx_id", "count")
        ).reset_index().sort_values("usd_revenue", ascending=False)

        if search:
            s = search.strip().lower()
            df_c = df_c[
                df_c["user_id"].str.lower().str.contains(s, na=False) |
                df_c["user_name"].str.lower().str.contains(s, na=False)
            ]

        total = len(df_c)
        total_pages = max(1, (total + page_size - 1) // page_size)
        page = max(1, min(page, total_pages))

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_df = df_c.iloc[start_idx:end_idx]

        items = [
            TopCustomer(
                user_id=r["user_id"],
                name=r["user_name"],
                status=r["user_status"],
                usd_revenue=round(float(r["usd_revenue"]), 2),
                eur_revenue=round(float(r["eur_revenue"]), 2),
                transaction_count=int(r["transaction_count"])
            )
            for _, r in page_df.iterrows()
        ]

        return CustomerListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

# Global singleton
state_manager = AppStateManager()
