from typing import Any
from fastapi import APIRouter, HTTPException

from app.pdf.generate_pdf import (
    build_report_context,
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
def render_pdf(payload: dict[str, Any]) -> dict[str, str]:
    try:
        from jinja2 import Environment, FileSystemLoader
        from pathlib import Path
        
        templates_dir = Path(__file__).parent.parent.parent / "pdf" / "templates"
        env = Environment(loader=FileSystemLoader(str(templates_dir)))
        template = env.get_template("bengali_report.html")
        html_content = template.render(**payload)
        return {"html": html_content}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

