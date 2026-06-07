import sys
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from datetime import date, time
from app.schemas import PdfRequest
from app.pdf.generate_pdf import build_report_context
import json

payload = PdfRequest(
    name="Test Name",
    father_name="",
    dob=date(2004, 8, 13),
    time=time(14, 42),
    place="Kolkata",
    mobile="",
    planet_overrides={
        "Sun": 117.03194,
        "Venus": 71.39306,
        "Mercury": 195.0,
        "Mars": 195.0,
        "Jupiter": 195.0,
        "Rahu": 11.44417,
        "Ketu": 191.44417
    }
)

context = build_report_context(payload)
print("HOUSE CHART:")
for house in context["house_chart"]:
    print(f"Sign Index {house['sign_index']} (House {house['house']}): {house['planets']}")

print("\nPLANET COORDS:")
print(json.dumps(context["planet_coords"], indent=2, ensure_ascii=False))



