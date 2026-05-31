from datetime import date, time
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.astrology.calculations import compare_planetary_engines


print("\n--- TEST CASE 1: 2004 Chart (Expected to match Lahiri) ---")
compare_planetary_engines(
    dob=date(2004, 8, 13),
    birth_time=time(14, 42),
    place="kolkata",
)

print("\n--- TEST CASE 2: 17 Feb 2018, 11:58 AM ---")
compare_planetary_engines(
    dob=date(2018, 2, 17),
    birth_time=time(11, 58),
    place="kolkata",
)

print("\n--- TEST CASE 3: 18 Jul 2006, 8:00 AM ---")
compare_planetary_engines(
    dob=date(2006, 7, 18),
    birth_time=time(8, 0),
    place="kolkata",
)
