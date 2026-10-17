import os
from pathlib import Path
from typing import Union, List
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ReconIQ — Financial Intelligence"
    VERSION: str = "4.2.1"
    API_PREFIX: str = "/api"
    
    # Project paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOADS_DIR: Path = BASE_DIR / "backend" / "uploads"
    AUDIT_DB_PATH: Path = BASE_DIR / "backend" / "reconiq_audit.db"
    
    # Default source data paths
    DEFAULT_DB_PATH: Path = DATA_DIR / "enterprise_database.db"
    DEFAULT_LOGS_PATH: Path = DATA_DIR / "server_logs.txt"
    DEFAULT_RATES_PATH: Path = DATA_DIR / "daily_exchange_rates.csv"
    DEFAULT_STATEMENT_PATH: Path = DATA_DIR / "statement.pdf"
    DEFAULT_NOTEBOOK_PATH: Path = DATA_DIR / "Student_work_file.ipynb"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

settings = Settings()
