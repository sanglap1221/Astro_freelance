from datetime import date, time
from app.astrology.calculations import calculate_chart

cases = [
    ("Sanglap", date(2004, 8, 13), time(14, 42)),
    ("Arka", date(2023, 10, 29), time(8, 42)),
    ("Sounak", date(2008, 2, 7), time(14, 0)),
]

for name, dob, bt in cases:
    try:
        res = calculate_chart(dob, bt, 'Kolkata')
        moon = next(p for p in res.planets if p.name == 'Moon')
        print(f"{name}: {moon.sign} {int(moon.degree_in_sign)}°{moon.minutes_in_sign}'{moon.seconds_in_sign}\" (lon={moon.longitude})")
    except Exception as e:
        print(f"{name}: ERROR {e}")
