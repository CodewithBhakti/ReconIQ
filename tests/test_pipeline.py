import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import sqlite3
import pytest
import pandas as pd
import numpy as np

from app.pipeline.user_processor import process_historical_users
from app.pipeline.log_parser import parse_server_logs
from app.pipeline.fx_engine import process_exchange_rates
from app.pipeline.reconciler import reconcile_financial_data
from app.pipeline.analytics import compute_financial_analytics
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def temp_db(tmp_path):
    """Creates a temporary synthetic SQLite database for deterministic unit testing."""
    db_file = tmp_path / "test_enterprise.db"
    conn = sqlite3.connect(str(db_file))
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE users (
        user_id TEXT,
        name TEXT,
        status TEXT,
        updated_at TIMESTAMP
    );
    """)
    # Insert users with multiple historical records
    # User 1: Pending -> Active -> Suspended (Latest is Suspended)
    cur.execute("INSERT INTO users VALUES ('U-001', 'Alice', 'Pending', '2023-01-01 10:00:00');")
    cur.execute("INSERT INTO users VALUES ('U-001', 'Alice', 'Active', '2023-01-15 10:00:00');")
    cur.execute("INSERT INTO users VALUES ('U-001', 'Alice', 'Suspended', '2023-02-01 10:00:00');")

    # User 2: Suspended -> Active (Latest is Active)
    cur.execute("INSERT INTO users VALUES ('U-002', 'Bob', 'Suspended', '2023-01-01 10:00:00');")
    cur.execute("INSERT INTO users VALUES ('U-002', 'Bob', 'Active', '2023-02-15 10:00:00');")

    # User 3: Only Active
    cur.execute("INSERT INTO users VALUES ('U-003', 'Charlie', 'Active', '2023-01-01 10:00:00');")

    conn.commit()
    conn.close()
    return db_file

@pytest.fixture
def temp_logs(tmp_path):
    """Creates temporary synthetic server logs."""
    log_file = tmp_path / "test_logs.txt"
    lines = [
        "Raw_Server_Log\n",
        '"[2023-01-15 00:00:00] INFO: Transaction processed. payload={""u"":""U-002"", ""item_code"":""PRD-101"", ""eur_val"":100.00}"\n',
        '"[2023-01-16 00:00:00] INFO: Transaction processed. payload={""u"":""U-001"", ""item_code"":""PRD-102"", ""eur_val"":200.00}"\n',
        '"[2023-01-17 00:00:00] ERROR: Transaction processed. payload={""u"":""U-002"", ""item_code"":""PRD-103"", ""failed_val"":50.00}"\n',
        '"[2023-01-18 00:00:00] INFO: Transaction processed. payload={""u"":""U-999"", ""item_code"":""PRD-104"", ""eur_val"":300.00}"\n',
        "Malformed corrupt non-json string here\n"
    ]
    with open(log_file, "w", encoding="utf-8") as f:
        f.writelines(lines)
    return log_file

@pytest.fixture
def temp_rates(tmp_path):
    """Creates temporary synthetic rates with weekend gap."""
    rates_file = tmp_path / "test_rates.csv"
    data = """Date,EUR_to_USD
2023-01-13,1.10
2023-01-14,
2023-01-15,
2023-01-16,1.15
2023-01-17,1.20
2023-01-18,1.25
"""
    with open(rates_file, "w", encoding="utf-8") as f:
        f.write(data)
    return rates_file

def test_historical_user_window_function(temp_db):
    """Tests that window function picks latest status and filters correctly."""
    df_latest, df_active, stats = process_historical_users(temp_db)
    
    assert len(df_latest) == 3
    # Check User 1 is Suspended (not Active, even though an older record was Active)
    u1_status = df_latest[df_latest["user_id"] == "U-001"]["status"].iloc[0]
    assert u1_status == "Suspended"
    
    # Check User 2 is Active
    u2_status = df_latest[df_latest["user_id"] == "U-002"]["status"].iloc[0]
    assert u2_status == "Active"
    
    # Active users count should be 2 (Bob and Charlie)
    assert len(df_active) == 2
    assert set(df_active["user_id"]) == {"U-002", "U-003"}

def test_log_parser_and_error_filtering(temp_logs):
    """Tests that INFO lines are parsed and ERROR/malformed lines are isolated."""
    df_valid, df_excluded, stats = parse_server_logs(temp_logs)
    
    # 3 valid INFO lines (U-002, U-001, U-999)
    assert len(df_valid) == 3
    assert stats["error_lines_filtered"] == 1
    assert stats["malformed_lines_filtered"] == 1
    assert stats["parsed_transactions"] == 3
    assert "eur_amount" in df_valid.columns

def test_exchange_rate_forward_filling(temp_rates):
    """Tests that weekend missing exchange rates are rolled forward."""
    df_rates, stats = process_exchange_rates(temp_rates, ffill_weekends=True)
    
    # Rate on Jan 14 and Jan 15 should be forward-filled from Jan 13 (1.10)
    df_rates["Date_str"] = df_rates["Date"].dt.strftime("%Y-%m-%d")
    r_14 = df_rates[df_rates["Date_str"] == "2023-01-14"]["EUR_to_USD"].iloc[0]
    r_15 = df_rates[df_rates["Date_str"] == "2023-01-15"]["EUR_to_USD"].iloc[0]
    
    assert r_14 == 1.10
    assert r_15 == 1.10
    assert stats["missing_rates_after_ffill"] == 0

def test_financial_reconciliation(temp_db, temp_logs, temp_rates):
    """Tests complete reconciliation logic, USD revenue, and exclusion reasons."""
    df_latest, df_active, _ = process_historical_users(temp_db)
    df_valid, df_excluded, _ = parse_server_logs(temp_logs)
    df_rates, _ = process_exchange_rates(temp_rates, ffill_weekends=True)
    
    df_all, df_reconciled, stats = reconcile_financial_data(
        df_valid, df_latest, df_rates, df_excluded
    )
    
    # U-002 on 2023-01-15: Active user, rate 1.10, eur 100 -> USD 110.00
    assert len(df_reconciled) == 1
    rec_tx = df_reconciled.iloc[0]
    assert rec_tx["user_id"] == "U-002"
    assert rec_tx["eur_amount"] == 100.00
    assert rec_tx["fx_rate"] == 1.10
    assert rec_tx["usd_amount"] == 110.00
    assert rec_tx["reconciliation_status"] == "Reconciled"
    
    # U-001 should be categorized as 'Inactive User'
    u1_record = df_all[df_all["user_id"] == "U-001"].iloc[0]
    assert u1_record["reconciliation_status"] == "Inactive User"
    
    # U-999 should be categorized as 'Unknown User'
    u999_record = df_all[df_all["user_id"] == "U-999"].iloc[0]
    assert u999_record["reconciliation_status"] == "Unknown User"

def test_empty_dataset_handling():
    """Tests that pipeline gracefully handles empty datasets."""
    empty_tx = pd.DataFrame(columns=["tx_id", "Date", "user_id", "product_id", "eur_amount"])
    empty_users = pd.DataFrame(columns=["user_id", "name", "status"])
    empty_rates = pd.DataFrame(columns=["Date", "EUR_to_USD"])
    empty_excl = pd.DataFrame(columns=["line_no", "raw_line", "reason"])
    
    df_all, df_rec, stats = reconcile_financial_data(empty_tx, empty_users, empty_rates, empty_excl)
    assert len(df_all) == 0
    assert len(df_rec) == 0
    assert stats == {}

def test_api_endpoints():
    """Tests FastAPI endpoints: health, dashboard, transactions, export."""
    client = TestClient(app)
    
    # 1. Health
    h_res = client.get("/health")
    assert h_res.status_code == 200
    assert h_res.json()["status"] == "HEALTHY"
    
    # 2. Dashboard
    d_res = client.get("/api/dashboard")
    assert d_res.status_code == 200
    d_json = d_res.json()
    assert "summary" in d_json
    assert "monthly_trends" in d_json
    assert "top_customers" in d_json
    
    # 3. Transactions paginated
    t_res = client.get("/api/transactions?page=1&page_size=10")
    assert t_res.status_code == 200
    t_json = t_res.json()
    assert len(t_json["items"]) == 10
    assert t_json["total"] > 50000
    
    # 4. CSV Export
    e_res = client.get("/api/export/transactions?status=Reconciled")
    assert e_res.status_code == 200
    assert "text/csv" in e_res.headers["content-type"]
    assert "attachment" in e_res.headers["content-disposition"]
    csv_content = e_res.text
    assert "Transaction_ID" in csv_content
    assert "USD_Revenue" in csv_content
