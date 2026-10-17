import sqlite3
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.models.schemas import AuditLogRecord

def init_audit_db():
    """Initializes the persistent SQLite audit database."""
    conn = sqlite3.connect(str(settings.AUDIT_DB_PATH))
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reconciliation_runs (
        run_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        duration_seconds REAL NOT NULL,
        total_input_lines INTEGER NOT NULL,
        reconciled_count INTEGER NOT NULL,
        excluded_count INTEGER NOT NULL,
        total_usd_revenue REAL NOT NULL,
        success_rate REAL NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        summary_json TEXT
    );
    """)
    conn.commit()
    conn.close()

def record_reconciliation_run(
    run_id: str,
    duration_seconds: float,
    total_input_lines: int,
    reconciled_count: int,
    excluded_count: int,
    total_usd_revenue: float,
    success_rate: float,
    status: str = "SUCCESS",
    notes: str = "Standard batch run",
    summary_data: Optional[Dict[str, Any]] = None
):
    init_audit_db()
    conn = sqlite3.connect(str(settings.AUDIT_DB_PATH))
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO reconciliation_runs 
    (run_id, created_at, duration_seconds, total_input_lines, reconciled_count, excluded_count, total_usd_revenue, success_rate, status, notes, summary_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        run_id,
        datetime.now(timezone.utc).isoformat(),
        round(duration_seconds, 3),
        total_input_lines,
        reconciled_count,
        excluded_count,
        round(total_usd_revenue, 2),
        round(success_rate, 2),
        status,
        notes,
        json.dumps(summary_data or {})
    ))
    conn.commit()
    conn.close()

def get_audit_runs(limit: int = 50) -> List[AuditLogRecord]:
    init_audit_db()
    conn = sqlite3.connect(str(settings.AUDIT_DB_PATH))
    cursor = conn.cursor()
    cursor.execute("""
    SELECT run_id, created_at, duration_seconds, total_input_lines, reconciled_count, excluded_count, total_usd_revenue, success_rate, status, notes
    FROM reconciliation_runs
    ORDER BY created_at DESC
    LIMIT ?;
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append(AuditLogRecord(
            run_id=r[0],
            created_at=r[1],
            duration_seconds=r[2],
            total_input_lines=r[3],
            reconciled_count=r[4],
            excluded_count=r[5],
            total_usd_revenue=r[6],
            success_rate=r[7],
            status=r[8],
            notes=r[9]
        ))
    return results
