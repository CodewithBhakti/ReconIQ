import re
from pathlib import Path
from typing import Tuple, Dict, Any, List
import pandas as pd

# Regex to match valid INFO logs with payload
# Matches format:
# "[2023-03-15 00:00:00] INFO: Transaction processed. payload={""u"":""U-19484"", ""item_code"":""PRD-874"", ""eur_val"":3404.44}"
LOG_INFO_PATTERN = re.compile(
    r'\[(?P<timestamp>\d{4}-\d{2}-\d{2}[^\]]*)\]\s+INFO:\s+Transaction processed\.\s+payload=\{.*?""?u""?:\s*""?(?P<user_id>[^",}]+)""?.*?""?item_code""?:\s*""?(?P<item_code>[^",}]+)""?.*?""?eur_val""?:\s*(?P<eur_val>[-+]?\d*\.?\d+)\}'
)

LOG_ERROR_PATTERN = re.compile(
    r'\[(?P<timestamp>\d{4}-\d{2}-\d{2}[^\]]*)\]\s+ERROR:'
)

def parse_server_logs(logs_path: Path | str) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Parses unstructured server log file with high efficiency.
    
    Trap 2 Resolution:
    Extracts Date, User ID, Product ID, and EUR amount while filtering out
    system error records ("ERROR") and handling malformed lines safely.
    
    Returns:
    - df_valid: Cleaned transaction records (line_no, timestamp, date, user_id, product_id, eur_amount, raw_line).
    - df_excluded: Records dropped at the log stage (line_no, raw_line, reason).
    - stats: Summary counts of raw lines, parsed records, errors, and malformed lines.
    """
    logs_path = str(logs_path)
    if not Path(logs_path).exists():
        raise FileNotFoundError(f"Log file not found at: {logs_path}")

    valid_records: List[Dict[str, Any]] = []
    excluded_records: List[Dict[str, Any]] = []
    
    total_lines = 0
    header_lines = 0
    error_count = 0
    malformed_count = 0

    with open(logs_path, "r", encoding="utf-8", errors="replace") as f:
        for line_no, raw_line in enumerate(f, start=1):
            total_lines += 1
            line = raw_line.strip()
            
            # Skip empty lines
            if not line:
                continue
                
            # Skip CSV/table header if present
            if line_no == 1 and ("Raw_Server_Log" in line or line.lower().startswith("timestamp")):
                header_lines += 1
                continue

            # Check if line indicates system ERROR
            if "ERROR" in line or LOG_ERROR_PATTERN.search(line):
                error_count += 1
                excluded_records.append({
                    "line_no": line_no,
                    "raw_line": line[:200],
                    "reason": "System Error Log (ERROR status filtered)"
                })
                continue

            # Extract fields with regex
            m = LOG_INFO_PATTERN.search(line)
            if m:
                ts_str = m.group("timestamp").strip()
                date_str = ts_str[:10]  # YYYY-MM-DD
                user_id = m.group("user_id").strip()
                product_id = m.group("item_code").strip()
                eur_val = float(m.group("eur_val"))
                
                # Assign a synthetic or extracted transaction ID for traceability
                tx_id = f"TX-{date_str.replace('-', '')}-{line_no:06d}"
                
                valid_records.append({
                    "tx_id": tx_id,
                    "line_no": line_no,
                    "timestamp": ts_str,
                    "date": date_str,
                    "user_id": user_id,
                    "product_id": product_id,
                    "eur_amount": eur_val,
                    "raw_line": line[:150]
                })
            else:
                malformed_count += 1
                excluded_records.append({
                    "line_no": line_no,
                    "raw_line": line[:200],
                    "reason": "Malformed Log String (Did not match JSON payload structure)"
                })

    df_valid = pd.DataFrame(valid_records)
    if not df_valid.empty:
        df_valid["Date"] = pd.to_datetime(df_valid["date"])
    else:
        df_valid = pd.DataFrame(columns=[
            "tx_id", "line_no", "timestamp", "date", "Date", "user_id", "product_id", "eur_amount", "raw_line"
        ])

    df_excluded = pd.DataFrame(excluded_records)
    if df_excluded.empty:
        df_excluded = pd.DataFrame(columns=["line_no", "raw_line", "reason"])

    stats = {
        "total_lines": total_lines,
        "header_lines": header_lines,
        "parsed_transactions": len(df_valid),
        "error_lines_filtered": error_count,
        "malformed_lines_filtered": malformed_count,
        "total_excluded_at_log_stage": len(df_excluded)
    }

    return df_valid, df_excluded, stats
