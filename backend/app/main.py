import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes.report import router as report_router
from app.api.routes.pdf import router as pdf_router

if getattr(sys, 'frozen', False):
    # If running as PyInstaller .exe, save PDFs next to the .exe
    base_dir = Path(sys.executable).parent
else:
    # If running normally via Python script
    base_dir = Path(__file__).resolve().parents[1]

generated_dir = base_dir / "generated"
generated_dir.mkdir(exist_ok=True)

app = FastAPI(title="Astro FreeLance Backend", version="0.1.0")

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

app.include_router(report_router)
app.include_router(pdf_router)
app.mount("/generated", StaticFiles(directory=generated_dir), name="generated")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
