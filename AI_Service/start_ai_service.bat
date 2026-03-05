@echo off
echo ========================================
echo Starting AI Visual Search Service
echo ========================================
echo.

cd /d %~dp0

REM ตรวจสอบว่า virtual environment มีอยู่หรือไม่
if not exist "venv" (
    echo Creating virtual environment...
    py -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM ติดตั้ง dependencies (ถ้ายังไม่ได้ติดตั้ง)
echo.
echo Installing/Updating dependencies...
pip install -r requirements.txt --quiet

echo.
echo ========================================
echo Starting AI Service on port 8000...
echo ========================================
echo.
echo Press Ctrl+C to stop the service
echo.

REM รัน AI Service
py main.py

pause

