from __future__ import annotations
import json
from datetime import time
from pathlib import Path

# Static mapping from sign name to index
SIGN_TO_INDEX = {
    "Mesha": 0, "Vrishabha": 1, "Mithuna": 2, "Karka": 3,
    "Simha": 4, "Kanya": 5, "Tula": 6, "Vrischika": 7,
    "Dhanu": 8, "Makara": 9, "Kumbha": 10, "Meena": 11
}

def load_lagna_table() -> dict:
    """Load the visuddha lagna table data from JSON."""
    data_path = Path(__file__).resolve().parent / "data" / "traditional_rules" / "visuddha_lagna_table.json"
    if not data_path.exists():
        return {}
    with open(data_path, "r", encoding="utf-8") as f:
        return json.load(f)

def lookup_table_lagna(month_name: str, day_num: int, birth_time: time, use_sidereal: bool = True) -> int:
    """
    Look up the active Lagna sign index from the table.
    
    Args:
        month_name:   Bengali month name in English (e.g. 'Phalguna')
        day_num:      Bengali day number (e.g. 4)
        birth_time:   Time object representing birth time
        use_sidereal: If True, use sidereal start times; else tropical.
        
    Returns:
        Sign index (0 to 11) of the active Lagna.
    """
    table = load_lagna_table()
    
    # Check if month and day exist in table
    month_data = table.get(month_name)
    if not month_data:
        raise ValueError(f"Month '{month_name}' not found in lagna table.")
        
    day_data = month_data.get(str(day_num))
    if not day_data:
        raise ValueError(f"Day '{day_num}' not found for month '{month_name}' in lagna table.")
        
    # Get the appropriate starts dictionary
    starts_dict = day_data.get("sidereal_lagna_starts" if use_sidereal else "tropical_lagna_starts")
    if not starts_dict:
        raise ValueError(f"Lagna starts not found in table for {month_name} {day_num}.")
        
    # Convert birth time to minutes from midnight
    birth_minutes = birth_time.hour * 60 + birth_time.minute
    
    # Parse table start times into minutes from midnight
    timeline = []
    for sign_name, start_time_str in starts_dict.items():
        h, m = map(int, start_time_str.split(":"))
        start_minutes = h * 60 + m
        sign_idx = SIGN_TO_INDEX[sign_name]
        timeline.append((start_minutes, sign_idx, sign_name))
        
    # Sort chronologically by start time
    timeline.sort(key=lambda x: x[0])
    
    # Find active lagna
    active_sign_idx = None
    
    # Search for the largest start time <= birth_minutes
    for start_min, sign_idx, name in timeline:
        if start_min <= birth_minutes:
            active_sign_idx = sign_idx
            
    # If birth time is before the earliest start time in the day, wrap around to the last sign of the day
    if active_sign_idx is None:
        active_sign_idx = timeline[-1][1]
        
    return active_sign_idx
