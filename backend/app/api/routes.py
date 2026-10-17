import io
import os
import shutil
from pathlib import Path
from typing import Optional, List
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.state import state_manager
from app.core.audit_db import get_audit_runs
from app.models.schemas import (
    ReconciliationRunRequest,
    ReconciliationSummary,
    DashboardResponse,
    TransactionListResponse,
    CustomerListResponse,
    AuditLogRecord,
    DataSourcesStatusResponse,
    FileValidationDetail
)

router = APIRouter()

@router.get("/health")
def health_check():
    """System health check and engine status."""
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "engine_state": "RUNNING" if state_manager.is_running else "IDLE",
        "last_run_id": state_manager.last_run_id,
        "last_run_time": state_manager.last_run_time
    }

@router.post("/reconciliation/run", response_model=ReconciliationSummary)
def run_reconciliation(req: Optional[ReconciliationRunRequest] = None):
    """Triggers the full 4-stage financial reconciliation pipeline."""
    if state_manager.is_running:
        raise HTTPException(status_code=409, detail="A reconciliation job is already running.")
    
    db_p = req.db_path if req and req.db_path else None
    logs_p = req.logs_path if req and req.logs_path else None
    rates_p = req.rates_path if req and req.rates_path else None
    ffill = req.ffill_weekends if req else True

    try:
        summary = state_manager.run_pipeline(
            db_path=db_p,
            logs_path=logs_p,
            rates_path=rates_p,
            ffill_weekends=ffill
        )
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reconciliation failed: {str(e)}")

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard():
    """Retrieves full executive dashboard KPIs, trends, charts, and distribution."""
    try:
        return state_manager.get_dashboard()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard loading failed: {str(e)}")

@router.get("/transactions", response_model=TransactionListResponse)
def get_transactions(
    search: Optional[str] = Query(None, description="Search by TXID, User ID, Name, Product"),
    status: Optional[str] = Query("All", description="Filter by status: All, Reconciled, Inactive User, Unknown User, Missing FX Rate"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=500),
    sort_by: str = Query("line_no"),
    sort_desc: bool = Query(False)
):
    """Retrieves paginated, searchable, sortable transactions with audit classification."""
    try:
        return state_manager.query_transactions(
            search=search,
            status=status,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_desc=sort_desc
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customers/top", response_model=CustomerListResponse)
def get_top_customers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100)
):
    """Retrieves customers ranked by audited USD revenue with pagination."""
    try:
        return state_manager.query_customers(
            search=search,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit-logs", response_model=List[AuditLogRecord])
def get_audit_log_history(limit: int = Query(50, ge=1, le=200)):
    """Retrieves persistent reconciliation run history and exception logs."""
    try:
        return get_audit_runs(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export/transactions")
def export_transactions(
    status: Optional[str] = Query("All", description="Export filter: All or Reconciled")
):
    """Exports full transaction ledger to downloadable CSV with complete financial audit trail."""
    if state_manager.df_all_tx is None:
        state_manager.run_pipeline()

    df = state_manager.df_all_tx.copy()
    if status and status != "All":
        df = df[df["reconciliation_status"] == status]

    # Select and rename columns for professional spreadsheet export
    export_cols = [
        "tx_id", "timestamp", "date", "user_id", "user_name", "user_status",
        "product_id", "eur_amount", "fx_rate", "usd_amount",
        "reconciliation_status", "exclusion_reason", "line_no"
    ]
    df_export = df[export_cols].copy()
    df_export.columns = [
        "Transaction_ID", "Timestamp", "Date", "User_ID", "Customer_Name", "Account_Status",
        "Product_ID", "EUR_Amount", "EUR_to_USD_Rate", "USD_Revenue",
        "Reconciliation_Status", "Exclusion_Reason", "Source_Line_No"
    ]

    output = io.StringIO()
    df_export.to_csv(output, index=False)
    output.seek(0)

    filename = f"reconiq_ledger_{status.lower().replace(' ', '_')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/upload")
async def upload_data_files(
    file_type: str = Form(..., description="db, logs, rates, statement, or notebook"),
    file: UploadFile = File(...)
):
    """Uploads and validates input files, saving them to backend/uploads."""
    settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    
    file_ext = Path(file.filename).suffix.lower()
    clean_filename = f"{file_type}_{Path(file.filename).name}"
    dest_path = settings.UPLOADS_DIR / clean_filename

    # Save file
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size_bytes = dest_path.stat().st_size
    errors = []
    row_count = 0
    fields = []

    try:
        if file_type == "db":
            import sqlite3
            conn = sqlite3.connect(str(dest_path))
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [r[0] for r in cur.fetchall()]
            if "users" not in tables:
                errors.append("SQLite database missing required 'users' table.")
            else:
                cur.execute("PRAGMA table_info(users);")
                fields = [r[1] for r in cur.fetchall()]
                cur.execute("SELECT COUNT(*) FROM users;")
                row_count = cur.fetchone()[0]
            conn.close()

        elif file_type == "rates":
            df_r = pd.read_csv(dest_path)
            fields = list(df_r.columns)
            row_count = len(df_r)
            if "Date" not in df_r.columns or "EUR_to_USD" not in df_r.columns:
                errors.append("CSV missing required 'Date' or 'EUR_to_USD' columns.")

        elif file_type == "logs":
            with open(dest_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            row_count = len(lines)
            fields = ["timestamp", "user_id", "product_id", "eur_val"]

        elif file_type == "statement":
            import pypdf
            reader = pypdf.PdfReader(str(dest_path))
            row_count = len(reader.pages)
            fields = ["PDF_Pages"]

        elif file_type == "notebook":
            import json
            with open(dest_path, "r", encoding="utf-8") as f:
                nb = json.load(f)
            row_count = len(nb.get("cells", []))
            fields = ["Notebook_Cells"]

    except Exception as e:
        errors.append(f"Validation error: {str(e)}")

    is_valid = len(errors) == 0

    return {
        "status": "VALID" if is_valid else "INVALID",
        "file_type": file_type,
        "filename": file.filename,
        "stored_path": str(dest_path),
        "size_bytes": size_bytes,
        "row_count": row_count,
        "fields": fields,
        "errors": errors
    }

@router.get("/datasources", response_model=DataSourcesStatusResponse)
def get_datasources_status():
    """Inspects all 5 workspace data files and validates their integrity."""
    def inspect_file(path: Path, ftype: str) -> FileValidationDetail:
        if not path.exists():
            return FileValidationDetail(
                file_type=ftype,
                file_name=path.name,
                exists=False,
                size_bytes=0,
                valid=False,
                row_or_line_count=0,
                columns_or_fields=[],
                errors=["File not found on filesystem"]
            )
        size = path.stat().st_size
        errors = []
        count = 0
        fields = []

        try:
            if ftype == "Database (SQLite)":
                import sqlite3
                conn = sqlite3.connect(str(path))
                c = conn.cursor()
                c.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [r[0] for r in c.fetchall()]
                if "users" in tables:
                    c.execute("PRAGMA table_info(users);")
                    fields = [r[1] for r in c.fetchall()]
                    c.execute("SELECT COUNT(*) FROM users;")
                    count = c.fetchone()[0]
                else:
                    errors.append("Missing table 'users'")
                conn.close()

            elif ftype == "Server Logs (TXT)":
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    count = sum(1 for _ in f)
                fields = ["Date", "Level", "User_ID", "Product_ID", "EUR_Amount"]

            elif ftype == "Exchange Rates (CSV)":
                df = pd.read_csv(path)
                fields = list(df.columns)
                count = len(df)
                if "Date" not in df.columns or "EUR_to_USD" not in df.columns:
                    errors.append("Missing required Date or EUR_to_USD columns")

            elif ftype == "Statement (PDF)":
                import pypdf
                reader = pypdf.PdfReader(str(path))
                count = len(reader.pages)
                fields = ["Pedagogical Analysis 4 Traps"]

            elif ftype == "Reference Notebook (IPYNB)":
                import json
                with open(path, "r", encoding="utf-8") as f:
                    nb = json.load(f)
                count = len(nb.get("cells", []))
                fields = ["Markdown & Code Cells"]

        except Exception as ex:
            errors.append(str(ex))

        return FileValidationDetail(
            file_type=ftype,
            file_name=path.name,
            exists=True,
            size_bytes=size,
            valid=(len(errors) == 0),
            row_or_line_count=count,
            columns_or_fields=fields,
            errors=errors
        )

    db_det = inspect_file(settings.DEFAULT_DB_PATH, "Database (SQLite)")
    log_det = inspect_file(settings.DEFAULT_LOGS_PATH, "Server Logs (TXT)")
    rate_det = inspect_file(settings.DEFAULT_RATES_PATH, "Exchange Rates (CSV)")
    pdf_det = inspect_file(settings.DEFAULT_STATEMENT_PATH, "Statement (PDF)")
    nb_det = inspect_file(settings.DEFAULT_NOTEBOOK_PATH, "Reference Notebook (IPYNB)")

    all_valid = db_det.valid and log_det.valid and rate_det.valid

    return DataSourcesStatusResponse(
        database=db_det,
        server_logs=log_det,
        exchange_rates=rate_det,
        statement_pdf=pdf_det,
        student_notebook=nb_det,
        all_valid=all_valid
    )
