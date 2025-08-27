@echo off
echo 🚀 Starting AI Study Buddy Backend Development Server
echo ==================================================

REM Check if virtual environment exists
if not exist "venv" (
    echo ❌ Virtual environment not found. Please create one first:
    echo    python -m venv venv
    echo    venv\Scripts\activate
    pause
    exit /b 1
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate

REM Install requirements if needed
echo 📦 Checking requirements...
pip install -r requirements.txt

REM Start development server
echo 🌐 Starting server...
python dev_server.py

pause
