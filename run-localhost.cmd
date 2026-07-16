@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" "%~dp0node_modules\astro\bin\astro.mjs" dev --host 127.0.0.1 --port 4321
pause
