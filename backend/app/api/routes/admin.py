"""
Admin API routes: dashboard stats, report listing, search, and report regeneration.
All routes require admin role.
"""
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth_middleware import require_admin
from app.db import get_dashboard_stats, get_all_reports, search_reports, get_report_by_id, clear_all_reports, delete_report_by_id

logger = logging.getLogger("astro_app.admin")

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard")
def dashboard(current_user: dict = Depends(require_admin)) -> dict[str, Any]:
    """Return dashboard statistics for the admin panel."""
    stats = get_dashboard_stats()
    return stats


@router.get("/reports")
def list_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Get paginated list of all customer reports."""
    return get_all_reports(page=page, limit=limit)


@router.get("/reports/search")
def search(
    name: str | None = Query(None),
    mobile: str | None = Query(None),
    date: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Search reports by name, mobile number, or date of birth."""
    return search_reports(name=name, mobile=mobile, date=date, page=page, limit=limit)


@router.get("/reports/{report_id}")
def get_report(
    report_id: str,
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Get a single report by its report_id for viewing/regeneration."""
    report = get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("/reports/{report_id}/regenerate")
def regenerate_report(
    report_id: str,
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """
    Regenerate chart and PDF from stored birth data.
    Returns the full calculated context (same as /api/calculate-report).
    """
    report = get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    try:
        from app.schemas import PdfRequest
        from app.pdf.generate_pdf import build_report_context

        # Reconstruct PdfRequest from stored lightweight data
        pdf_request = PdfRequest(
            name=report["name"],
            father_name=report.get("father_name", ""),
            dob=report["dob"],
            time=report["tob"],
            place=report["birth_place"],
            mobile=report.get("mobile", ""),
            latitude=report.get("latitude"),
            longitude=report.get("longitude"),
            timezone=report.get("timezone"),
        )

        context = build_report_context(pdf_request)
        context["report_id"] = report_id
        context["show_kundli"] = True
        context["show_mahadasha"] = True
        context["show_antardasha"] = True
        context["show_lucky_info"] = True

        return context

    except Exception as exc:
        logger.error(f"Error regenerating report {report_id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(exc)}")


@router.delete("/reports")
def delete_all_history(current_user: dict = Depends(require_admin)) -> dict[str, Any]:
    """Delete all customer reports/history from the database."""
    deleted_count = clear_all_reports()
    return {"message": "All history deleted successfully", "deleted_count": deleted_count}


@router.delete("/reports/{report_id}")
def delete_single_report(
    report_id: str,
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Delete a single customer report by its ID."""
    success = delete_report_by_id(report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or delete failed")
    return {"message": f"Report {report_id} deleted successfully"}
