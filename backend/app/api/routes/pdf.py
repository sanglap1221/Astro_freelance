import uuid
from typing import Any
from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.pdf.generate_pdf import (
    build_report_context,
)
from app.schemas import PdfRequest
from app.db import save_astro_data

router = APIRouter(tags=["pdf"])

# Global memory-based tracking of compilation statuses
pdf_statuses: dict[str, dict[str, Any]] = {}

def compile_pdf_task(payload: dict[str, Any], report_id: str):
    from jinja2 import Environment, FileSystemLoader
    from pathlib import Path
    import sys
    # pyrefly: ignore [missing-import]
    from playwright.sync_api import sync_playwright
    import logging

    logger = logging.getLogger("astro_app.pdf_task")
    filename = f"report_{report_id}.pdf"
    
    try:
        # Stage 1: Render Jinja2 template (Progress 25)
        pdf_statuses[report_id] = {"status": "compiling", "progress": 25}
        
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            templates_dir = Path(sys._MEIPASS) / "app" / "pdf" / "templates"
        else:
            templates_dir = Path(__file__).parent.parent.parent / "pdf" / "templates"
            
        env = Environment(loader=FileSystemLoader(str(templates_dir)))
        template = env.get_template("bengali_report.html")
        html_content = template.render(**payload)
        
        # Stage 2: Initialize Playwright (Progress 50)
        pdf_statuses[report_id] = {"status": "compiling", "progress": 50}
        
        if getattr(sys, 'frozen', False):
            backend_root = Path(sys.executable).parent
        else:
            backend_root = Path(__file__).resolve().parents[3]
        generated_dir = backend_root / "generated"
        generated_dir.mkdir(exist_ok=True)
        output_path = generated_dir / filename
        
        # Stage 3: Render to PDF using Playwright (Progress 75)
        pdf_statuses[report_id] = {"status": "compiling", "progress": 75}
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_content(html_content)
            page.wait_for_load_state("networkidle")
            page.pdf(
                path=str(output_path),
                format="A4",
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
            )
            browser.close()
                
        # Stage 4: Ready (Progress 100)
        pdf_statuses[report_id] = {"status": "ready", "progress": 100}
        logger.info(f"Background PDF compilation successful for report {report_id}")
    except Exception as exc:
        logger.error(f"Background PDF compilation failed for report {report_id}: {exc}")
        pdf_statuses[report_id] = {"status": "failed", "progress": 0, "error": str(exc)}


@router.post("/api/calculate-report")
def calculate_report(payload: PdfRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    try:
        context = build_report_context(payload)
        
        # Generate a unique report_id for tracking
        report_id = str(uuid.uuid4())
        context["report_id"] = report_id
        
        # Add default layout toggles so the frontend gets them
        context["show_kundli"] = True
        context["show_mahadasha"] = True
        context["show_antardasha"] = True
        context["show_lucky_info"] = True

        # Persist calculations (handling database connection failure gracefully)
        save_astro_data(
            report_no=context.get("report_no", ""),
            customer_name=context.get("customer", {}).get("name", ""),
            input_details=payload.dict(),
            calculated_chart=context
        )
        
        # Immediately trigger PDF compilation in background task
        pdf_statuses[report_id] = {"status": "pending", "progress": 10}
        background_tasks.add_task(compile_pdf_task, context, report_id)

        return context
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/render-pdf")
def render_pdf(payload: dict[str, Any], background_tasks: BackgroundTasks) -> dict[str, str]:
    try:
        from jinja2 import Environment, FileSystemLoader
        from pathlib import Path
        import sys
        
        report_id = payload.get("report_id")
        if not report_id:
            report_id = str(uuid.uuid4())
            payload["report_id"] = report_id
            
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            templates_dir = Path(sys._MEIPASS) / "app" / "pdf" / "templates"
        else:
            templates_dir = Path(__file__).parent.parent.parent / "pdf" / "templates"
        env = Environment(loader=FileSystemLoader(str(templates_dir)))
        template = env.get_template("bengali_report.html")
        html_content = template.render(**payload)
        
        filename = f"report_{report_id}.pdf"
        
        # Trigger re-compilation task in background
        pdf_statuses[report_id] = {"status": "pending", "progress": 10}
        background_tasks.add_task(compile_pdf_task, payload, report_id)
        
        return {
            "html": html_content,
            "pdf_url": f"/generated/{filename}"
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/pdf-status/{report_id}")
def get_pdf_status(report_id: str):
    from pathlib import Path
    import sys
    
    # 1. Check in-memory status dictionary first
    if report_id in pdf_statuses:
        return pdf_statuses[report_id]
        
    # 2. Check if the PDF file exists on disk
    if getattr(sys, 'frozen', False):
        backend_root = Path(sys.executable).parent
    else:
        backend_root = Path(__file__).resolve().parents[3]
    file_path = backend_root / "generated" / f"report_{report_id}.pdf"
    if file_path.exists():
        return {"status": "ready", "progress": 100}
        
    # 3. Default fallback
    return {"status": "pending", "progress": 0}


@router.get("/api/download-pdf/{filename}")
def download_pdf(filename: str, name: str = None):
    import time
    import urllib.parse
    from fastapi.responses import FileResponse
    from pathlib import Path
    import sys
    
    if getattr(sys, 'frozen', False):
        backend_root = Path(sys.executable).parent
    else:
        backend_root = Path(__file__).resolve().parents[3]
    file_path = backend_root / "generated" / filename
    
    # Extract report_id from filename to check active compilation status
    report_id = None
    if filename.startswith("report_") and filename.endswith(".pdf"):
        report_id = filename[7:-4]
        
    # Wait up to 5 seconds for the background task to compile the file
    for _ in range(10):
        if file_path.exists():
            if report_id and report_id in pdf_statuses:
                if pdf_statuses[report_id]["status"] == "ready":
                    break
            else:
                break
        time.sleep(0.5)
        
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not ready or still compiling")
        
    if report_id and report_id in pdf_statuses:
        if pdf_statuses[report_id]["status"] in ("pending", "compiling"):
            raise HTTPException(status_code=404, detail="File not ready or still compiling")
            
    download_name = name if name else filename
    if not download_name.endswith(".pdf"):
        download_name += ".pdf"
        
    encoded_name = urllib.parse.quote(download_name)
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}"
    }
    
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        headers=headers
    )
