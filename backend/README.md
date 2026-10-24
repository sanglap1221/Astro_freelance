# Astro FreeLance Backend

First backend slice for the astrologer workflow.

## Setup

### Python

`pyswisseph` is supported on Python 3.11+ on all platforms. On Python 3.13+ it
builds from source (no pre-built wheel yet), so ensure the C toolchain is
available:

```bash
# Linux
sudo apt install build-essential python3-dev
# macOS
xcode-select --install
```

```powershell
py -3.11 -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If `py -3.11` is not available, install Python 3.11 first and run the same commands inside the backend folder.

### MongoDB

A local MongoDB instance is required on `localhost:27017`. If it is not running,
the API starts but returns `503` on database-dependent endpoints.

```bash
# macOS (Homebrew)
brew tap mongodb/brew && brew install mongodb-community && mongod --config /opt/homebrew/etc/mongod.conf

# Linux (no-root) — download the tarball from mongodb.com and run:
./bin/mongod --dbpath /home/sanglapg/.local/mongodb-data --port 27017
```

On first startup the backend auto-creates a default admin account:
- **Username:** `Sagar Ghosh`
- **Password:** `123456`

### Playwright

After installing the Python packages, install the Chromium browser that
Playwright uses for PDF generation:

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
