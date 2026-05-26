from datetime import date, time
from pathlib import Path
import sys

# Ensure backend root is on sys.path so `app` imports work when run from anywhere.
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.astrology.calculations import calculate_chart, print_chart


MITALI_DOB = date(2006, 7, 16)
MITALI_BIRTH_TIME = time(6, 13)


def main() -> None:
    chart = calculate_chart(
        dob=MITALI_DOB,
        birth_time=MITALI_BIRTH_TIME,
        place="Kolkata",
        debug_trace=True,
    )

    print_chart(chart)


if __name__ == "__main__":
    main()
