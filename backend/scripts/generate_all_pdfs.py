import os
import sys
from pathlib import Path
from datetime import date, time

# Add backend directory to Python path so imports work correctly when running directly
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.pdf.generate_pdf import generate_pdf_report
from app.schemas import PdfRequest

def run_combined_batch_tests():
    # Combined list of extracted profiles for testing
    test_profiles = [
        # --- BATCH 1 ---
        {
            "name": "Baishakhi De",
            "dob": date(1987, 4, 26),
            "time": time(1, 30), # Expected Active Window: 1:30 AM to 03:03 AM
            "place": "Kolkata"
        },
        {
            "name": "Anjali Mandal",
            "dob": date(1994, 10, 9),
            "time": time(18, 0), # Expected Active Window: 05:38 PM to 07:17 PM 
            "place": "Kolkata"
        },
        {
            "name": "Bikash Mandal",
            "dob": date(1984, 5, 28),
            "time": time(16, 30), # Expected Active Window: 02:58 PM to 05:07 PM 
            "place": "Kolkata"
        },
        {
            "name": "SUbhajit Sabui",
            "dob": date(1991, 4, 12),
            "time": time(8, 15), # Expected Active Window: 7:22 AM to 9:22 AM (that is not correct almost) 
            "place": "Kolkata"
        },
        {
            "name": "Subhajit Bol",
            "dob": date(1992, 7, 25),
            "time": time(11, 30), # Expected Active Window: 11:09 AM to 01:22 PM 
            "place": "Kolkata"
        },
        {
            "name": "Sarodindu Karmakar",
            "dob": date(2011, 11, 6),
            "time": time(9, 18), # Expected Active Window: 08:58 AM to 10:59 AM 
            "place": "Kolkata"
        },
        
        # --- BATCH 2 ---
        {
            "name": "Arka Mandal",
            "dob": date(2023, 10, 29),
            "time": time(6, 42), # Expected Active Window: 07:8 AM to 08:01 AM 
            "place": "Kolkata"
        },
       
        {
            "name": "Sanglap Ghosh",
            "dob": date(2004, 8, 13),
            "time": time(14, 42), # Expected Active Window: 01:51 PM to 03:55 PM 
            "place": "Kolkata"
        },
        {
            "name": "Mitali Biswas",
            "dob": date(2006, 7, 18),
            "time": time(8, 0), # Expected Active Window: 07:19 AM to 10:10 AM
            "place": "Kolkata"
        },
        {
            "name": "Agniv Ghosh",
            "dob": date(2018, 2, 17),
            "time": time(11, 58), # Expected Active Window: 10:38 AM to 12:35 PM
            "place": "Kolkata"
        },
        {
            "name": "Atyuttama Datta",
            "dob": date(2024, 11, 15),
            "time": time(9, 53), # Expected Active Window: 08:13 AM to 10:19 AM
            "place": "Kolkata"
        },
        {
            "name": "Unknown Client",
            "dob": date(1995, 3, 22),
            "time": time(17, 32), # Expected Active Window: 04:58 PM to 07:12 PM 
            "place": "Kolkata"
        }
    ]

    print(f"🚀 Starting Batch PDF Generation for {len(test_profiles)} profiles...")
    
    for index, profile in enumerate(test_profiles, start=1):
        print(f"[{index}/{len(test_profiles)}] Processing chart for {profile['name']}...")
        
        # Instantiate the schema payload
        payload = PdfRequest(
            name=profile["name"],
            dob=profile["dob"],
            time=profile["time"],
            place=profile["place"],
            father_name="",
            mobile="",
            ayanamsa_mode="lahiri",
            custom_ayanamsa_degrees=None,
            true_moon=True,
            true_node=True,
            planet_overrides=None,
            override_moon_longitude=None
        )

        try:
            # Call the generator function
            result = generate_pdf_report(payload)
            print(f"✅ Success: PDF generated at -> {result.pdf_url}\n")
        except Exception as e:
            print(f"❌ Failed to generate PDF for {profile['name']}. Error: {e}\n")
            
    print("🎉 Batch generation complete!")

if __name__ == "__main__":
    run_combined_batch_tests()