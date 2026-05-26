from datetime import datetime


def get_ayanamsa(date_str: str) -> dict:
    """Return an ayanamsa value to subtract from tropical positions to get nirayana.

    This is a simple placeholder returning an approximate Lahiri value and a short label.
    For authoritative work, replace with exact edition lookup from the Panjika.
    """
    # approximate fixed Lahiri value for demonstration (degrees)
    ayan_deg = 23.853
    return {"name": "Lahiri (approx)", "degrees": ayan_deg}
