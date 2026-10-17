from typing import Tuple, Dict, Any, List
import pandas as pd
import numpy as np

def reconcile_financial_data(
    df_tx: pd.DataFrame,
    df_latest_users: pd.DataFrame,
    df_rates: pd.DataFrame,
    df_log_excluded: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Core Financial Reconciliation Engine.
    
    Merges transactions with exchange rates by Date,
    and with customer records by user_id.
    
    Calculates USD Revenue = EUR Amount * EUR_to_USD.
    
    Classifies every transaction into:
    - 'Reconciled': Valid log + active customer + valid FX rate.
    - 'Inactive User': Customer latest status is Pending/Suspended/Inactive.
    - 'Unknown User': User ID not found in customer master database.
    - 'Missing FX Rate': No valid exchange rate found for the transaction date.
    
    Returns:
    - df_all_transactions: Comprehensive unified ledger of all transactions with status and details.
    - df_reconciled: Clean ledger of fully matched and converted transactions.
    - summary_stats: Complete statistical accounting of reconciliation run.
    """
    if df_tx.empty:
        empty_cols = [
            "tx_id", "timestamp", "date", "user_id", "user_name", "user_status",
            "product_id", "eur_amount", "fx_rate", "usd_amount",
            "reconciliation_status", "exclusion_reason", "line_no"
        ]
        return pd.DataFrame(columns=empty_cols), pd.DataFrame(columns=empty_cols), {}

    # Merge step 1: Temporal join with exchange rates on Date
    df_merged = df_tx.merge(df_rates, on="Date", how="left")
    
    # Merge step 2: Master data join with user database on user_id
    user_lookup = df_latest_users[["user_id", "name", "status"]].copy()
    user_lookup.rename(columns={"name": "user_name", "status": "user_status"}, inplace=True)
    df_merged = df_merged.merge(user_lookup, on="user_id", how="left")
    
    # Categorization masks
    missing_fx_mask = df_merged["EUR_to_USD"].isna() | (df_merged["EUR_to_USD"] <= 0)
    unknown_user_mask = df_merged["user_status"].isna()
    inactive_user_mask = (~unknown_user_mask) & (df_merged["user_status"] != "Active")
    reconciled_mask = (~missing_fx_mask) & (~unknown_user_mask) & (df_merged["user_status"] == "Active")

    # Vectorized assignment of status and reasons
    conditions = [
        reconciled_mask,
        inactive_user_mask,
        unknown_user_mask,
        missing_fx_mask
    ]
    statuses = [
        "Reconciled",
        "Inactive User",
        "Unknown User",
        "Missing FX Rate"
    ]
    reasons = [
        "Matched Active Account & Audited FX Rate",
        "Account status is " + df_merged["user_status"].fillna("Inactive"),
        "User ID not found in Enterprise User Database",
        "Exchange rate unavailable for transaction date"
    ]

    df_merged["reconciliation_status"] = np.select(conditions, statuses, default="Unclassified")
    df_merged["exclusion_reason"] = np.select(conditions, reasons, default="Inspection Required")
    df_merged["fx_rate"] = df_merged["EUR_to_USD"]

    # Calculate USD Revenue for matched records
    df_merged["usd_amount"] = np.where(
        reconciled_mask,
        df_merged["eur_amount"] * df_merged["fx_rate"],
        0.0
    )
    
    # Round to 2 decimal places for financial reporting
    df_merged["usd_amount"] = df_merged["usd_amount"].round(2)
    df_merged["eur_amount"] = df_merged["eur_amount"].round(2)
    
    # Subset of reconciled
    df_reconciled = df_merged[df_merged["reconciliation_status"] == "Reconciled"].copy()

    # Reconciled metrics
    total_eur = float(df_reconciled["eur_amount"].sum())
    total_usd = float(df_reconciled["usd_amount"].sum())
    avg_fx = float(df_reconciled["fx_rate"].mean()) if not df_reconciled.empty else 0.0

    # Counts
    reconciled_count = len(df_reconciled)
    inactive_count = int(inactive_user_mask.sum())
    unknown_count = int(unknown_user_mask.sum())
    missing_fx_count = int(missing_fx_mask.sum())
    total_valid_tx = len(df_merged)

    # Calculate success rate
    success_rate = round((reconciled_count / total_valid_tx * 100), 2) if total_valid_tx > 0 else 0.0

    summary_stats = {
        "valid_transactions_count": total_valid_tx,
        "reconciled_count": reconciled_count,
        "inactive_user_count": inactive_count,
        "unknown_user_count": unknown_count,
        "missing_fx_count": missing_fx_count,
        "total_eur_revenue": total_eur,
        "total_usd_revenue": total_usd,
        "average_fx_rate": round(avg_fx, 4),
        "reconciliation_success_rate": success_rate
    }

    # Ensure consistent columns
    output_columns = [
        "tx_id", "timestamp", "date", "Date", "user_id", "user_name", "user_status",
        "product_id", "eur_amount", "fx_rate", "usd_amount",
        "reconciliation_status", "exclusion_reason", "line_no", "raw_line"
    ]
    df_all_transactions = df_merged[output_columns].copy()

    return df_all_transactions, df_reconciled, summary_stats
