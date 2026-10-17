import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.audit_db import init_audit_db
from app.core.state import state_manager
from app.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and pre-warm data
    init_audit_db()
    # Trigger initial baseline reconciliation if data files are present
    try:
        if settings.DEFAULT_DB_PATH.exists() and settings.DEFAULT_LOGS_PATH.exists():
            state_manager.run_pipeline()
            print("[ReconIQ] Data pipeline initialized and baseline reconciliation complete.")
    except Exception as e:
        print(f"[ReconIQ] Warning during startup pipeline run: {e}")
    yield
    # Shutdown
    print("[ReconIQ] Shutting down server.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Financial Intelligence and Multi-Currency Reconciliation Platform",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint at root
@app.get("/health")
def health():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "engine_state": "RUNNING" if state_manager.is_running else "IDLE"
    }

# Include API routes
app.include_router(router, prefix=settings.API_PREFIX)
