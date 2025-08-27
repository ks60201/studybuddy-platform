#!/bin/bash

echo "🚀 Starting AI Study Buddy Backend Development Server"
echo "=================================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please create one first:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate  # On macOS/Linux"
    echo "   venv\\Scripts\\activate     # On Windows"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements if needed
echo "📦 Checking requirements..."
pip install -r requirements.txt

# Start development server
echo "🌐 Starting server..."
python dev_server.py


