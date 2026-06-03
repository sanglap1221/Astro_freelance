from datetime import date, time, datetime, timedelta
import sys
import json
from pathlib import Path
from zoneinfo import ZoneInfo

# Add backend to path
sys.path.append(r"d:\My Projects\Astro_FreeLance\backend")

# pyrefly: ignore [missing-import]
import swisseph as swe
from app.astrology.bengali_date import gregorian_to_bengali, BENGALI_MONTHS_EN
from app.astrology.calculations import ZODIAC_SIGNS

def get_lagna_lon(dt: datetime, lat: float, lon: float, is_sidereal: bool) -> float:
    utc_dt = dt.astimezone(ZoneInfo("UTC"))
    jd = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    )
    cusps, ascmc = swe.houses(jd, lat, lon, b'P')
    tropical_asc = ascmc[0]
    if is_sidereal:
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        ayanamsa = swe.get_ayanamsa_ut(jd)
        return (tropical_asc - ayanamsa) % 360.0
    else:
        return tropical_asc % 360.0

def find_lagna_start_times(greg_date: date, lat: float, lon: float, is_sidereal: bool) -> dict[str, str]:
    tz = ZoneInfo("Asia/Kolkata")
    start_dt = datetime.combine(greg_date, datetime.min.time(), tzinfo=tz)
    
    # Trace lagna for every minute of the day to find boundaries
    lagna_starts = {}
    current_sign = None
    
    for m in range(24 * 60):
        dt = start_dt + timedelta(minutes=m)
        lagna = get_lagna_lon(dt, lat, lon, is_sidereal)
        sign_idx = int(lagna // 30)
        
        # When sign changes, record the start time
        if sign_idx != current_sign:
            current_sign = sign_idx
            sign_name = ZODIAC_SIGNS[sign_idx]
            lagna_starts[sign_name] = dt.strftime("%H:%M")
            
    # Fill in any missing signs that didn't start on this day by scanning slightly before/after if needed,
    # but scanning 24 hours will cover almost all signs.
    return lagna_starts

def main():
    cases = [
        date(2018, 2, 17), # Agniv Ghosh
        date(2006, 7, 18), # Mitali Biswas (verify_kaka)
        date(2006, 7, 16), # Mitali Biswas (calculations.md)
        date(1995, 3, 22), # Sample A
        date(2024, 11, 15), # Sample B
        date(2023, 10, 29), # User case 3
        date(1991, 4, 12),  # User case 4
    ]
    
    # Lat/Lon for Kolkata
    lat = 22.5726
    lon = 88.3639
    
    table_data = {}
    
    for dt in cases:
        y, m_idx, d = gregorian_to_bengali(dt)
        month_name = BENGALI_MONTHS_EN[m_idx]
        
        if month_name not in table_data:
            table_data[month_name] = {}
            
        # Find start times
        sid_starts = find_lagna_start_times(dt, lat, lon, is_sidereal=True)
        trop_starts = find_lagna_start_times(dt, lat, lon, is_sidereal=False)
        
        table_data[month_name][str(d)] = {
            "gregorian_date": dt.isoformat(),
            "sidereal_lagna_starts": sid_starts,
            "tropical_lagna_starts": trop_starts
        }
        print(f"Calculated lagna table for Bengali date: {month_name} {d}, {y} (Gregorian: {dt.isoformat()})")

    # Save to JSON
    output_dir = Path(r"d:\My Projects\Astro_FreeLance\backend\app\astrology\data\traditional_rules")
    output_dir.mkdir(exist_ok=True, parents=True)
    output_file = output_dir / "visuddha_lagna_table.json"
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(table_data, f, indent=2)
        
    print(f"Saved lagna table to {output_file}")

if __name__ == "__main__":
    main()
