import sqlite3
from pathlib import Path
from typing import Tuple, Dict, Any
import pandas as pd

def process_historical_users(db_path: Path | str) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Extracts and normalizes historical user records from SQLite database.
    
    Trap 4 Resolution:
    Uses SQL Window Function ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, rowid DESC)
    to select the latest chronological record for each unique user_id.
    
    Tie-breaking rule:
    If multiple records share the exact latest updated_at timestamp for a user,
    the row with the highest internal rowid (most recently inserted) is chosen.
    
    Returns:
    - df_latest_users: All unique users with their latest status and timestamp.
    - df_active_users: Subset where status == 'Active'.
    - stats: Dictionary of extraction counts and status breakdown.
    """
    db_path = str(db_path)
    if not Path(db_path).exists():
        raise FileNotFoundError(f"Database file not found at: {db_path}")

    conn = sqlite3.connect(db_path)
    try:
        # Check table and columns
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        if not cursor.fetchone():
            raise ValueError("Expected table 'users' not found in SQLite database.")
        
        cursor.execute("PRAGMA table_info(users);")
        columns = [row[1] for row in cursor.fetchall()]
        required_cols = {"user_id", "name", "status", "updated_at"}
        missing_cols = required_cols - set(columns)
        if missing_cols:
            raise ValueError(f"Missing required columns in 'users' table: {missing_cols}")

        # Window query to isolate latest record per user_id
        query = """
        WITH RankedUsers AS (
            SELECT 
                user_id,
                name,
                status,
                updated_at,
                ROW_NUMBER() OVER(
                    PARTITION BY user_id 
                    ORDER BY updated_at DESC, rowid DESC
                ) as rn
            FROM users
            WHERE user_id IS NOT NULL AND TRIM(user_id) != ''
        )
        SELECT 
            user_id,
            name,
            status,
            updated_at
        FROM RankedUsers
        WHERE rn = 1;
        """
        
        df_latest_users = pd.read_sql_query(query, conn)
        
        # Ensure updated_at is properly parsed
        df_latest_users["updated_at"] = pd.to_datetime(df_latest_users["updated_at"], errors="coerce")
        
        # Clean string statuses
        df_latest_users["status"] = df_latest_users["status"].fillna("Unknown").astype(str).str.strip()
        df_latest_users["name"] = df_latest_users["name"].fillna(df_latest_users["user_id"]).astype(str).str.strip()
        
        # Filter for active users
        df_active_users = df_latest_users[df_latest_users["status"] == "Active"].copy()
        
        # Get total raw user rows in DB for audit
        cursor.execute("SELECT COUNT(*) FROM users;")
        total_raw_rows = cursor.fetchone()[0]
        
        status_counts = df_latest_users["status"].value_counts().to_dict()
        
        stats = {
            "total_raw_rows": total_raw_rows,
            "total_unique_users": len(df_latest_users),
            "active_users_count": len(df_active_users),
            "inactive_users_count": len(df_latest_users) - len(df_active_users),
            "status_breakdown": status_counts,
            "tie_breaker_rule": "rowid DESC on equal updated_at"
        }
        
        return df_latest_users, df_active_users, stats
        
    finally:
        conn.close()
