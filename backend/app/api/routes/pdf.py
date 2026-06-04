import uuid
from typing import Any
from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.pdf.generate_pdf import (
    build_report_context,
    render_pdf_from_context,
)
from app.schemas import PdfRequest
from app.db import save_astro_data

router = APIRouter(tags=["pdf"])


@router.post("/api/calculate-report")
def calculate_report(payload: PdfRequest) -> dict[str, Any]:
    try:
        context = build_report_context(payload)
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

        return context
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/render-pdf")
def render_pdf(payload: dict[str, Any], background_tasks: BackgroundTasks) -> dict[str, str]:
    try:
        from jinja2 import Environment, FileSystemLoader
        from pathlib import Path
        
        templates_dir = Path(__file__).parent.parent.parent / "pdf" / "templates"
        env = Environment(loader=FileSystemLoader(str(templates_dir)))
        template = env.get_template("bengali_report.html")
        html_content = template.render(**payload)
        
        filename = f"report_{uuid.uuid4().hex}.pdf"
        background_tasks.add_task(render_pdf_from_context, payload, filename)
        
        return {
            "html": html_content,
            "pdf_url": f"/generated/{filename}"
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/download-pdf/{filename}")
def download_pdf(filename: str, name: str = None):
    import time
    import urllib.parse
    from fastapi.responses import FileResponse
    from pathlib import Path
    
    backend_root = Path(__file__).resolve().parents[3]
    file_path = backend_root / "generated" / filename
    
    # Wait up to 5 seconds for the background task to compile the file
    for _ in range(10):
        if file_path.exists():
            break
        time.sleep(0.5)
        
    if not file_path.exists():
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

