# Moon Debug Runners

This folder contains runnable scripts to isolate Moon-longitude mismatches.

## Scripts

- `debug_moon.py`: step-by-step interpolation debug for one case.
- `compare_systems.py`: side-by-side comparison across multiple Moon systems.

## Run

Use project root as current directory:

```powershell
$env:PYTHONPATH='backend'; backend\.venv311\Scripts\python backend/scripts/debug_moon.py
$env:PYTHONPATH='backend'; backend\.venv311\Scripts\python backend/scripts/compare_systems.py
```

## Notes

- Current table interpolation auto-loads year files from `backend/app/astrology/ephemeris/moon/`.
- Expected files: `moon/2004.json`, `moon/2018.json`, etc.
- Swiss outputs require `pyswisseph` availability in the active Python.
- If Swiss is unavailable, the script prints `UNAVAILABLE` for those systems.
