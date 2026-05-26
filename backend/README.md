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
