from pathlib import Path
from typing import Tuple, Dict, Any
import pandas as pd
import numpy as np

def process_exchange_rates(
    rates_path: Path | str, 
    ffill_weekends: bool = True
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Loads, cleans, and temporal-aligns EUR-to-USD exchange rates.
    
    Trap 3 Resolution:
    Financial markets close on weekends, leaving Saturday and Sunday without rates.
    This module uses forward-filling (ffill) so Friday's rate rolls over to the weekend,
    preventing silent transaction drops during temporal joins.
    
    Returns:
    - df_rates: Cleaned, chronologically sorted DataFrame with Date and EUR_to_USD.
    - stats: Dictionary with rate metrics, missing rate counts before/after ffill.
    """
    rates_path = str(rates_path)
    if not Path(rates_path).exists():
        raise FileNotFoundError(f"Exchange rates file not found at: {rates_path}")

    df = pd.read_csv(rates_path)
    
    # Column validation
    cols = [c.strip() for c in df.columns]
    df.columns = cols
    
    if "Date" not in df.columns or "EUR_to_USD" not in df.columns:
        raise ValueError("Exchange rates CSV must contain 'Date' and 'EUR_to_USD' columns.")

    # Parse dates
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    invalid_dates = df["Date"].isna().sum()
    df = df.dropna(subset=["Date"]).copy()

    # Parse numeric rates
    df["EUR_to_USD"] = pd.to_numeric(df["EUR_to_USD"], errors="coerce")
    
    # Sort chronologically
    df = df.sort_values("Date").drop_duplicates(subset=["Date"], keep="last").reset_index(drop=True)
    
    total_dates = len(df)
    missing_before_ffill = int(df["EUR_to_USD"].isna().sum())
    
    # Forward fill missing dates (e.g., weekends)
    if ffill_weekends:
        df["EUR_to_USD"] = df["EUR_to_USD"].ffill()
    
    missing_after_ffill = int(df["EUR_to_USD"].isna().sum())
    
    # Validate rates are positive and finite
    valid_mask = (df["EUR_to_USD"] > 0) & np.isfinite(df["EUR_to_USD"])
    valid_rates_count = int(valid_mask.sum())
    
    stats = {
        "total_calendar_days": total_dates,
        "invalid_dates_dropped": int(invalid_dates),
        "missing_rates_before_ffill": missing_before_ffill,
        "missing_rates_after_ffill": missing_after_ffill,
        "valid_rates_count": valid_rates_count,
        "min_rate": float(df["EUR_to_USD"].min()) if valid_rates_count > 0 else 0.0,
        "max_rate": float(df["EUR_to_USD"].max()) if valid_rates_count > 0 else 0.0,
        "mean_rate": float(df["EUR_to_USD"].mean()) if valid_rates_count > 0 else 0.0,
        "ffill_enabled": ffill_weekends
    }

    return df[["Date", "EUR_to_USD"]], stats
