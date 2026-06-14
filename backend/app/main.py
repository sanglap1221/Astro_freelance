import sys
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes.report import router as report_router
from app.api.routes.pdf import router as pdf_router
from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
from app.db import init_default_admin

logger = logging.getLogger("astro_app")

if getattr(sys, 'frozen', False):
    # If running as PyInstaller .exe, save PDFs next to the .exe
    base_dir = Path(sys.executable).parent
else:
    # If running normally via Python script
    base_dir = Path(__file__).resolve().parents[1]

generated_dir = base_dir / "generated"
generated_dir.mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: runs startup tasks before serving requests."""
    # Initialize default admin user on startup
    logger.info("Initializing default admin user...")
    init_default_admin()
    yield


app = FastAPI(title="Astro FreeLance Backend", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://sanglapastro.vercel.app",
        "https://sanglap-astro.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes (public — no JWT required)
app.include_router(auth_router)

# Protected routes
app.include_router(report_router)
app.include_router(pdf_router)
app.include_router(admin_router)

app.mount("/generated", StaticFiles(directory=generated_dir), name="generated")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
