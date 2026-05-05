#!/bin/bash

# Zimyo AI Assistant - Quick Start Script
# Single Python service. The MCP tool layer runs in-process inside the
# FastAPI app (see `services/mcp_server/`); no separate Node bridge.

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "         🚀 Zimyo AI Assistant - Quick Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTHON_DIR="$SCRIPT_DIR/zimyo_ai_assistant"

# Step 1: Redis
echo "📋 Step 1: Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running"
    echo ""
    echo "Starting Redis..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew services start redis
            echo "✅ Redis started via Homebrew"
        else
            echo "⚠️  Please install Redis: brew install redis"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start redis-server
        echo "✅ Redis started via systemd"
    else
        echo "⚠️  Please start Redis manually"
        exit 1
    fi
    sleep 2
    if ! redis-cli ping > /dev/null 2>&1; then
        echo "❌ Failed to start Redis"
        exit 1
    fi
fi
echo ""

# Step 2: Python venv
echo "📋 Step 2: Checking Python environment..."
cd "$PYTHON_DIR"
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment exists"
fi
echo ""

# Step 3: Activate + deps
echo "📋 Step 3: Activating virtual environment..."
source venv/bin/activate
if ! python -c "import fastapi" 2>/dev/null; then
    echo "⚠️  Dependencies not installed. Installing..."
    pip install --upgrade pip -q
    pip install -r requirements.txt -q
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Step 4: .env
echo "📋 Step 4: Checking configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "❌ .env file not found"
    echo "Please create .env file with required variables (see hrms_agents/.env.example)"
    exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "         🔥 Starting Zimyo AI Assistant"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Python API will be available at: http://localhost:8080"
echo "API Documentation at: http://localhost:8080/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""
sleep 2

uvicorn hrms_agents.main:app --host 0.0.0.0 --port 8080 --reload
