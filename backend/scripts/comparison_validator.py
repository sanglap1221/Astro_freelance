import sys
from pathlib import Path
from datetime import date, time, datetime, timedelta
from zoneinfo import ZoneInfo
# pyrefly: ignore [missing-import]
import swisseph as swe

# Add backend to path
sys.path.append(r"d:\My Projects\Astro_FreeLance\backend")

if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.astrology.bengali_date import gregorian_to_bengali, BENGALI_MONTHS_EN, BENGALI_MONTHS_BN
from app.astrology.lagna_table import lookup_table_lagna
from app.astrology.calculations import calculate_chart, ZODIAC_SIGNS, _load_ascendant_table, _lookup_time_table_value

# Test cases with expected lagnas (using standard English sign names and index)
# Note: Agniv Ghosh expected Vrishabha (1), Mitali Biswas (verify_kaka) expected Kanya (5),
# Mitali Biswas (calculations.md) expected Simha (4)
cases = [
    {
        "name": "Agniv Ghosh",
        "dob": date(2018, 2, 17),
        "tob": time(11, 58),
        "expected_idx": 1,
        "expected_name": "Vrishabha"
    },
    {
        "name": "Mitali Biswas (verify_kaka)",
        "dob": date(2006, 7, 18),
        "tob": time(8, 0),
        "expected_idx": 4,
        "expected_name": "Simha"
    },
    {
        "name": "Mitali Biswas (calculations.md)",
        "dob": date(2006, 7, 16),
        "tob": time(6, 13),
        "expected_idx": 4,
        "expected_name": "Simha"
    },
    {
        "name": "User Case 3 (2023-10-29)",
        "dob": date(2023, 10, 29),
        "tob": time(8, 42),
        "expected_idx": 7,
        "expected_name": "Vrischika"
    },
    {
        "name": "User Case 4 (1991-04-12)",
        "dob": date(1991, 4, 12),
        "tob": time(8, 15),
        "expected_idx": 1,
        "expected_name": "Vrishabha"
    },
]

def get_astronomical_lagna(dob: date, tob: time) -> tuple[int, float]:
    lat = 22.5726
    lon = 88.3639
    tz = ZoneInfo("Asia/Kolkata")
    dt = datetime.combine(dob, tob, tzinfo=tz)
    utc_dt = dt.astimezone(ZoneInfo("UTC"))
    
    jd = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    )
    
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    ayanamsa = swe.get_ayanamsa_ut(jd)
    cusps, ascmc = swe.houses(jd, lat, lon, b'P')
    tropical_asc = ascmc[0]
    sidereal_asc = (tropical_asc - ayanamsa) % 360.0
    return int(sidereal_asc // 30), sidereal_asc

def calculate_boundary_difference(dob: date, tob: time, target_sign_idx: int) -> float:
    """Calculate the difference in minutes to the nearest boundary of the target sign."""
    lat = 22.5726
    lon = 88.3639
    tz = ZoneInfo("Asia/Kolkata")
    
    # Calculate for each minute of the day
    start_dt = datetime.combine(dob, datetime.min.time(), tzinfo=tz)
    birth_minutes = tob.hour * 60 + tob.minute
    
    # Trace boundaries
    boundaries = []
    current_sign = None
    
    for m in range(24 * 60):
        dt = start_dt + timedelta(minutes=m)
        utc_dt = dt.astimezone(ZoneInfo("UTC"))
        jd = swe.julday(
            utc_dt.year, utc_dt.month, utc_dt.day,
            utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
        )
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        ayanamsa = swe.get_ayanamsa_ut(jd)
        cusps, ascmc = swe.houses(jd, lat, lon, b'P')
        sidereal_asc = (ascmc[0] - ayanamsa) % 360.0
        sign_idx = int(sidereal_asc // 30)
        
        if sign_idx != current_sign:
            if current_sign is not None:
                # Transition at minute m
                boundaries.append((m, current_sign, sign_idx))
            current_sign = sign_idx
            
    # Find boundary for target sign
    diffs = []
    for m, s_from, s_to in boundaries:
        if s_from == target_sign_idx or s_to == target_sign_idx:
            diffs.append(abs(birth_minutes - m))
            
    if diffs:
        return min(diffs)
    return 0.0

def main():
    print("=" * 100)
    print(" VALIADATION COMPARISON REPORT: KAKA BABU'S LAGNA CALCULATION")
    print("=" * 100)
    
    results = []
    
    for case in cases:
        name = case["name"]
        dob = case["dob"]
        tob = case["tob"]
        exp_idx = case["expected_idx"]
        exp_name = case["expected_name"]
        
        # 1. Convert to Bengali Date
        y, m_idx, d = gregorian_to_bengali(dob)
        month_name = BENGALI_MONTHS_EN[m_idx]
        bengali_date_str = f"{d} {month_name} {y}"
        
        # 2. Method A: Direct Astronomical Sidereal
        ast_idx, ast_lon = get_astronomical_lagna(dob, tob)
        ast_name = ZODIAC_SIGNS[ast_idx]
        
        # 3. Method B: Table-based Sidereal (Visuddha)
        tab_sid_idx = lookup_table_lagna(month_name, d, tob, use_sidereal=True)
        tab_sid_name = ZODIAC_SIGNS[tab_sid_idx]
        
        # 4. Method C: Table-based Tropical
        tab_trop_idx = lookup_table_lagna(month_name, d, tob, use_sidereal=False)
        tab_trop_name = ZODIAC_SIGNS[tab_trop_idx]
        
        # 5. Method D: Current Buggy Software
        chart_buggy = calculate_chart(dob, tob, "Kolkata", ayanamsa_mode="lahiri")
        bug_idx = chart_buggy.lagna_sign_index
        bug_name = chart_buggy.lagna_sign
        
        # Boundary difference for target sign
        boundary_diff = calculate_boundary_difference(dob, tob, exp_idx)
        
        results.append({
            "name": name,
            "dob": dob,
            "tob": tob,
            "bengali_date": bengali_date_str,
            "expected": f"{exp_name} ({exp_idx})",
            "ast": f"{ast_name} ({ast_idx})",
            "tab_sid": f"{tab_sid_name} ({tab_sid_idx})",
            "tab_trop": f"{tab_trop_name} ({tab_trop_idx})",
            "bug": f"{bug_name} ({bug_idx})",
            "ast_match": ast_idx == exp_idx,
            "tab_sid_match": tab_sid_idx == exp_idx,
            "tab_trop_match": tab_trop_idx == exp_idx,
            "bug_match": bug_idx == exp_idx,
            "boundary_diff": boundary_diff
        })
        
    # Print comparison table
    print(f"{'Case Name':<30} | {'Expected':<12} | {'A: Ast Sid':<12} | {'B: Tab Sid':<12} | {'C: Tab Trop':<12} | {'D: Buggy SW':<12}")
    print("-" * 105)
    for r in results:
        m_ast = "[Y]" if r["ast_match"] else "[N]"
        m_tab_sid = "[Y]" if r["tab_sid_match"] else "[N]"
        m_tab_trop = "[Y]" if r["tab_trop_match"] else "[N]"
        m_bug = "[Y]" if r["bug_match"] else "[N]"
        
        print(f"{r['name'][:30]:<30} | {r['expected']:<12} | {r['ast'] + ' ' + m_ast:<12} | {r['tab_sid'] + ' ' + m_tab_sid:<12} | {r['tab_trop'] + ' ' + m_tab_trop:<12} | {r['bug'] + ' ' + m_bug:<12}")
        
    print("\n" + "=" * 100)
    print(" ANALYSIS & MATCH STATISTICS")
    print("=" * 100)
    
    n_cases = len(cases)
    match_ast = sum(1 for r in results if r["ast_match"])
    match_tab_sid = sum(1 for r in results if r["tab_sid_match"])
    match_tab_trop = sum(1 for r in results if r["tab_trop_match"])
    match_bug = sum(1 for r in results if r["bug_match"])
    
    print(f"Method A (Direct Sidereal) match rate   : {match_ast}/{n_cases} ({match_ast/n_cases*100:.1f}%)")
    print(f"Method B (Table-based Sidereal) match   : {match_tab_sid}/{n_cases} ({match_tab_sid/n_cases*100:.1f}%)")
    print(f"Method C (Table-based Tropical) match   : {match_tab_trop}/{n_cases} ({match_tab_trop/n_cases*100:.1f}%)")
    print(f"Method D (Current Buggy SW) match       : {match_bug}/{n_cases} ({match_bug/n_cases*100:.1f}%)")
    
    print("\nBoundary differences to expected lagna:")
    for r in results:
        print(f"  {r['name']}: {r['boundary_diff']:.1f} minutes from lagna boundary")
        
if __name__ == "__main__":
    main()
