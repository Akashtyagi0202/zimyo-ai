#!/bin/bash

# Zimyo AI Assistant - Quick Start Script
# This script helps you start the application easily

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "         🚀 Zimyo AI Assistant - Quick Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTHON_DIR="$SCRIPT_DIR/zimyo_ai_assistant"
NODE_DIR="$SCRIPT_DIR/zimyo_api_server"

# Step 1: Check Redis
echo "📋 Step 1: Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running"
    echo ""
    echo "Starting Redis..."

    # Try to start Redis based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew services start redis
            echo "✅ Redis started via Homebrew"
        else
            echo "⚠️  Please install Redis: brew install redis"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo systemctl start redis-server
        echo "✅ Redis started via systemd"
    else
        echo "⚠️  Please start Redis manually"
        exit 1
    fi

    # Wait for Redis to start
    sleep 2

    if ! redis-cli ping > /dev/null 2>&1; then
        echo "❌ Failed to start Redis"
        exit 1
    fi
fi
echo ""

# Step 2: Check Python virtual environment
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

# Step 3: Activate virtual environment and check dependencies
echo "📋 Step 3: Activating virtual environment..."
source venv/bin/activate

# Check if key packages are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "⚠️  Dependencies not installed. Installing..."
    pip install --upgrade pip -q
    pip install -r requirements.txt -q
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Step 4: Check .env file
echo "📋 Step 4: Checking configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "❌ .env file not found"
    echo "Please create .env file with required variables"
    exit 1
fi
echo ""

# Step 5: Ask user which mode to run
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Select run mode:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1) Development (stdio) - Python only, auto-spawns MCP"
echo "2) Production (HTTP)   - Separate Python + Node.js servers"
echo ""
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "         🔥 Starting in Development Mode"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Python API will be available at: http://localhost:8080"
        echo "API Documentation at: http://localhost:8080/docs"
        echo ""
        echo "Press Ctrl+C to stop"
        echo ""
        sleep 2

        # Run Python app (will auto-spawn MCP server)
        uvicorn hrms_agents.main:app --host 0.0.0.0 --port 8080 --reload
        ;;

    2)
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "         🔥 Starting in Production Mode"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        # Check if Node.js is installed
        if ! command -v node &> /dev/null; then
            echo "❌ Node.js not found. Please install Node.js"
            exit 1
        fi

        # Check if Node.js dependencies are installed
        cd "$NODE_DIR"
        if [ ! -d "node_modules" ]; then
            echo "⚠️  Installing Node.js dependencies..."
            npm install
        fi

        echo "Starting Node.js MCP Server..."
        echo ""

        # Start Node.js server in background
        node src/mcp/server.js > /tmp/zimyo_node_server.log 2>&1 &
        NODE_PID=$!

        echo "✅ Node.js server started (PID: $NODE_PID)"
        echo "   Logs: /tmp/zimyo_node_server.log"
        sleep 2

        # Go back to Python directory
        cd "$PYTHON_DIR"

        # Set environment variable for HTTP mode
        export MCP_SERVER_URL=http://localhost:3000/mcp

        echo ""
        echo "Starting Python FastAPI..."
        echo ""
        echo "Services available at:"
        echo "  - Python API: http://localhost:8080"
        echo "  - Node.js MCP: http://localhost:3000"
        echo "  - API Docs: http://localhost:8080/docs"
        echo ""
        echo "Press Ctrl+C to stop both servers"
        echo ""
        sleep 2

        # Trap Ctrl+C to kill both processes
        trap "echo ''; echo 'Stopping servers...'; kill $NODE_PID 2>/dev/null; exit" INT TERM

        # Run Python app
        uvicorn hrms_agents.main:app --host 0.0.0.0 --port 8080 --reload
        ;;

    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac
