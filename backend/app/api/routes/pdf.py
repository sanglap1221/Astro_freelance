import uuid
from typing import Any
from datetime import date
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends

from app.pdf.generate_pdf import (
    build_report_context,
    TRANSLATIONS,
    to_local_digits,
    REMEDIES_TRANSLATIONS,
)
from app.astrology.calculations import _calendar_ymd_diff
from app.schemas import PdfRequest
from app.db import save_astro_data
from app.auth_middleware import get_current_user

def enrich_payload_with_translations(payload: dict[str, Any]):
    lang = payload.get("lang") or payload.get("language") or "bn"
    if lang not in TRANSLATIONS:
        lang = "bn"
    payload["lang"] = lang
    
    labels = TRANSLATIONS[lang]
    payload["labels"] = labels
    
    if lang == "bn":
        digit_map = {'0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯'}
    elif lang == "hi":
        digit_map = {'0':'०', '1':'१', '2':'२', '3':'३', '4':'४', '5':'५', '6':'६', '7':'७', '8':'८', '9':'९'}
    else:
        digit_map = {'0':'0', '1':'1', '2':'2', '3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8', '9':'9'}
    payload["digit_map"] = digit_map

    # 1. Translate remedies_list if present
    frontend_remedies = payload.get("remedies_list")
    if frontend_remedies:
        id_map = {"১": 1, "২": 2, "৩": 3, "৪": 4, "৫": 5, "৬": 6, "৭": 7, "৮": 8, "৯": 9,
                  "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
                  "१": 1, "२": 2, "३": 3, "४": 4, "५": 5, "६": 6, "७": 7, "८": 8, "९": 9}
        local_base_remedies = REMEDIES_TRANSLATIONS[lang]
        remedies = []
        for item in frontend_remedies:
            item_id_str = str(item.get("id", ""))
            item_idx = id_map.get(item_id_str, 1) - 1
            if 0 <= item_idx < len(local_base_remedies):
                base_item = local_base_remedies[item_idx]
                remedies.append({
                    "id": base_item["id"],
                    "gemstone": base_item["gemstone"],
                    "remedy_root": base_item["remedy_root"],
                    "gemstone_rating": item.get("gemstone_rating", 0),
                    "root_rating": item.get("root_rating", 0),
                })
            else:
                remedies.append(item)
        payload["remedies_list"] = remedies

    # 2. Translate antardasha_display_rows if present
    REVERSE_PLANET_ABBR_BN = {
        "র": "Sun", "চ": "Moon", "ম": "Mars", "বু": "Mercury",
        "বৃ": "Jupiter", "শু": "Venus", "শ": "Saturn", "রা": "Rahu", "কে": "Ketu", "ল": "Lagna", "লং": "Lagna"
    }

    def parse_local_date(date_str: str) -> date:
        if not date_str:
            return None
        clean = ""
        for char in str(date_str):
            if '০' <= char <= '৯':
                clean += str(ord(char) - ord('০'))
            elif '०' <= char <= '९':
                clean += str(ord(char) - ord('०'))
            elif char.isdigit():
                clean += char
            elif char in ('-', '/', '.'):
                clean += '-'
        
        parts = clean.split('-')
        if len(parts) == 3:
            try:
                day = int(parts[0])
                month = int(parts[1])
                year = int(parts[2])
                if len(parts[0]) == 4:
                    year = int(parts[0])
                    day = int(parts[2])
                return date(year, month, day)
            except ValueError:
                pass
        return None

    def format_local_date(d: date, lang: str) -> str:
        d_str = d.strftime("%d-%m-%Y")
        return to_local_digits(d_str, lang)

    if "antardasha_display_rows" in payload and isinstance(payload["antardasha_display_rows"], list):
        translated_rows = []
        for row in payload["antardasha_display_rows"]:
            r = dict(row)
            
            major_lord = r.get("major_lord")
            if not major_lord or major_lord not in labels["planet_abbr"]:
                mbn = r.get("major_bn", "")
                major_lord = REVERSE_PLANET_ABBR_BN.get(mbn, major_lord)
            
            lord = r.get("lord")
            if not lord or lord not in labels["planet_abbr"]:
                lbn = r.get("lord_bn", "")
                lord = REVERSE_PLANET_ABBR_BN.get(lbn, lord)
            
            if major_lord in labels["planet_abbr"]:
                r["major_bn"] = labels["planet_abbr"][major_lord]
            if lord in labels["planet_abbr"]:
                r["lord_bn"] = labels["planet_abbr"][lord]
            
            start_date = parse_local_date(r.get("start", ""))
            end_date = parse_local_date(r.get("end", ""))
            
            if start_date:
                r["start"] = format_local_date(start_date, lang)
            if end_date:
                r["end"] = format_local_date(end_date, lang)
                
            if start_date and end_date:
                dur_y, dur_m, dur_d = _calendar_ymd_diff(start_date, end_date)
                r["dur_y"] = to_local_digits(str(dur_y), lang)
                r["dur_m"] = to_local_digits(str(dur_m), lang)
                r["dur_d"] = to_local_digits(str(dur_d), lang)
            else:
                for field in ("dur_y", "dur_m", "dur_d"):
                    val = r.get(field)
                    if val is not None:
                        val_clean = ""
                        for char in str(val):
                            if '০' <= char <= '৯':
                                val_clean += str(ord(char) - ord('০'))
                            elif '०' <= char <= '९':
                                val_clean += str(ord(char) - ord('०'))
                            elif char.isdigit():
                                val_clean += char
                        r[field] = to_local_digits(val_clean, lang)
            
            translated_rows.append(r)
        
        payload["antardasha_display_rows"] = translated_rows


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
        enrich_payload_with_translations(payload)
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
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-gpu",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--no-first-run",
                    "--no-zygote",
                    "--single-process"
                ]
            )
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
def calculate_report(
    payload: PdfRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
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

        # Persist lightweight customer record (no chart data stored)
        created_by = current_user.get("sub", "system")
        save_astro_data(
            report_no=context.get("report_no", ""),
            customer_name=context.get("customer", {}).get("name", ""),
            input_details=payload.dict(),
            calculated_chart=context,
            created_by=created_by,
        )
        
        # Immediately trigger PDF compilation in background task
        pdf_statuses[report_id] = {"status": "pending", "progress": 10}
        background_tasks.add_task(compile_pdf_task, context, report_id)

        return context
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/render-pdf")
def render_pdf(
    payload: dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
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
        enrich_payload_with_translations(payload)
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
def download_pdf(
    filename: str,
    name: str = None,
    current_user: dict = Depends(get_current_user),
):
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
