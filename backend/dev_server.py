#!/usr/bin/env python3
"""
Development server for AI Study Buddy Backend
Properly configured to avoid watching virtual environment files
"""

import uvicorn
import os
from pathlib import Path

def main():
    # Get the current directory
    current_dir = Path(__file__).parent
    
    # Define directories to exclude from watching
    exclude_patterns = [
        "venv/*",
        "*/venv/*", 
        "__pycache__/*",
        "*.pyc",
        ".git/*",
        "node_modules/*",
        "*.log",
        "uploads/*"
    ]
    
    # Convert to proper format for uvicorn
    reload_excludes = [str(current_dir / pattern) for pattern in exclude_patterns]
    
    print("🚀 Starting AI Study Buddy Backend Development Server")
    print(f"📍 Directory: {current_dir}")
    print(f"🚫 Excluding: {', '.join(exclude_patterns)}")
    print("🌐 Server will be available at: http://localhost:8000")
    print("📚 API docs at: http://localhost:8000/docs")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(current_dir)],  # Only watch current directory
        reload_excludes=reload_excludes,  # Exclude problematic directories
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    main()
