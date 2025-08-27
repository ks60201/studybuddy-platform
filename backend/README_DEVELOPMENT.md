# 🚀 AI Study Buddy Backend - Development Guide

## The Problem

The backend was constantly reloading due to watching virtual environment files (`venv/`), causing frequent server restarts and poor performance.

## ✅ Solution

We've created separate development and production configurations to fix this issue.

## 🛠️ How to Start the Backend

### Option 1: Development Server (Recommended)

Use the development server that properly excludes problematic directories:

**On macOS/Linux:**

```bash
cd backend
./start_dev.sh
```

**On Windows:**

```cmd
cd backend
start_dev.bat
```

### Option 2: Manual Start

```bash
cd backend
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate     # On Windows

python dev_server.py
```

### Option 3: Production Mode

```bash
cd backend
source venv/bin/activate
python main.py
```

## 🔧 What Each Script Does

### `dev_server.py`

- ✅ **Smart File Watching**: Only watches your source code
- 🚫 **Excludes**: `venv/`, `__pycache__/`, `.git/`, etc.
- 🔄 **Auto-reload**: Restarts only when you change your code
- 📊 **Better Logging**: Clear startup messages and status

### `start_dev.sh` / `start_dev.bat`

- 🔧 **Auto-activates** virtual environment
- 📦 **Checks requirements** are installed
- 🚀 **Starts development server** with proper configuration

## 🎯 Benefits of the New Setup

1. **No More Constant Reloading** - Server only restarts when you change your code
2. **Faster Startup** - No watching unnecessary files
3. **Better Performance** - Stable server during development
4. **Clear Logging** - See exactly what's happening
5. **Cross-Platform** - Works on macOS, Linux, and Windows

## 🚨 Troubleshooting

### If you still see reloading issues:

1. Make sure you're using `dev_server.py` or the startup scripts
2. Check that `venv/` is in your backend directory
3. Ensure you're not running `main.py` directly with reload=True

### If the server won't start:

1. Check that your virtual environment is activated
2. Verify all requirements are installed: `pip install -r requirements.txt`
3. Make sure port 8000 is available

## 🌐 Access Points

- **API Server**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

---

**Happy Coding! 🎉** Your backend should now be stable and fast during development.


