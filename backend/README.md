# Astro FreeLance Backend

First backend slice for the astrologer workflow.

## Setup

Use Python 3.11 for real Swiss Ephemeris support on Windows.

```powershell
py -3.11 -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If `py -3.11` is not available, install Python 3.11 first and run the same commands inside the backend folder.

After installing the Python packages, install the Chromium browser that Playwright uses for PDF generation:

```powershell
python -m playwright install chromium
```

## Run

1. Install dependencies from `requirements.txt`.
2. Start the API with Uvicorn:

```bash
uvicorn app.main:app --reload
```

## PM Bagchi Moon Model

Moon calibration is now productionized as a dynamic formula with four tunable parameters:

- `PM_BAGCHI_BASE_OFFSET_DEGREES`
- `PM_BAGCHI_YEAR_COEFF_DEGREES`
- `PM_BAGCHI_SEASONAL_AMP_DEGREES`
- `PM_BAGCHI_LON_TERM_AMP_DEGREES`

The model is enabled by default in the backend and uses Swiss Ephemeris sidereal Surya Siddhanta mode plus the tuned dynamic correction layer.

Example PowerShell session:

```powershell
$env:PM_BAGCHI_BASE_OFFSET_DEGREES = "3.315422"
$env:PM_BAGCHI_YEAR_COEFF_DEGREES = "-0.000723"
$env:PM_BAGCHI_SEASONAL_AMP_DEGREES = "-0.298975"
$env:PM_BAGCHI_LON_TERM_AMP_DEGREES = "-0.224951"
uvicorn app.main:app --reload
```

## Tests

Run Moon acceptance tests:

```powershell
pytest tests/test_moon_acceptance.py
```

## Endpoint

- `POST /api/generate-chart`

Example payload:

```json
{
  "name": "Sanglap",
  "dob": "2005-01-16",
  "time": "14:30:00",
  "place": "Kolkata"
}
```
