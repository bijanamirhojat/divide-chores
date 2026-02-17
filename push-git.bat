@echo off
set GH_TOKEN=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

cd /d "%~dp0divide-chores"

echo.
echo === Pushen naar GitHub ===
echo.

git remote set-url origin https://%GH_TOKEN%@github.com/bijanamirhojat/divide-chores.git

git push -u origin main

echo.
echo Klaar!
pause
