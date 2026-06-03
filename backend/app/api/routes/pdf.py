from typing import Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.pdf.generate_pdf import (
    generate_pdf_report,
    build_report_context,
    render_pdf_from_context,
    render_pdf_to_memory,
)
from app.schemas import PdfRequest, PdfResponse
from app.db import save_astro_data

router = APIRouter(tags=["pdf"])


@router.post("/generate-pdf", response_model=PdfResponse)
def generate_pdf(payload: PdfRequest) -> PdfResponse:
    try:
        result = generate_pdf_report(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return PdfResponse(pdf_url=result.pdf_url)


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
def render_pdf(payload: dict[str, Any]) -> StreamingResponse:
    try:
        pdf_buf = render_pdf_to_memory(payload)
        return StreamingResponse(pdf_buf, media_type="application/pdf")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/download-report")
def download_report(payload: dict[str, Any]) -> StreamingResponse:
    try:
        pdf_buf = render_pdf_to_memory(payload)
        headers = {
            "Content-Disposition": 'attachment; filename="report.pdf"'
        }
        return StreamingResponse(pdf_buf, media_type="application/pdf", headers=headers)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
