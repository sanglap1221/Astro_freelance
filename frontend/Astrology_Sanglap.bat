@echo off

start cmd /k "cd /d D:\My Projects\Astro_FreeLance\backend && .\venv\Scripts\python.exe -m uvicorn app.main:app"

start cmd /k "cd /d D:\My Projects\Astro_FreeLance\frontend && npm run start"