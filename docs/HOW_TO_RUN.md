# How to Run Zimyo AI Assistant 🚀

Complete step-by-step guide to run your HRMS AI Assistant application.

---

## Prerequisites

Before running the app, ensure you have:

- ✅ **Python 3.8+** installed
- ✅ **Node.js 16+** installed
- ✅ **Redis** installed and running
- ✅ **Git** (if cloning from repository)

---

## Project Structure

```
zimyo ai/
├── zimyo_ai_assistant/          # Python FastAPI Backend
│   ├── app.py                   # Main FastAPI application
│   ├── services/                # Organized service modules
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # Environment variables
│
└── zimyo_api_server/            # Node.js API Server
    ├── src/
    │   ├── mcp/server.js       # MCP server
    │   └── routes/             # API routes
    ├── package.json            # Node.js dependencies
    └── .env                    # Environment variables
```

---

## Step 1: Install Redis

### macOS (using Homebrew):
```bash
brew install redis
brew services start redis
```

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Windows:
Download from: https://redis.io/download
Or use Docker:
```bash
docker run -d -p 6379:6379 redis
```

### Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

---

## Step 2: Setup Python Backend (zimyo_ai_assistant)

### 1. Navigate to Python project:
```bash
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_ai_assistant"
```

### 2. Create virtual environment:
```bash
python3 -m venv venv
```

### 3. Activate virtual environment:

**macOS/Linux:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

### 4. Install Python dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**If you get errors, install missing packages:**
```bash
# Core dependencies
pip install fastapi uvicorn requests redis python-dotenv pydantic

# AI/ML dependencies
pip install sentence-transformers numpy openai langchain langchain-openai langchain-community

# Document processing
pip install PyMuPDF pdfplumber

# Utilities
pip install httpx python-multipart fuzzywuzzy python-levenshtein langdetect

# Vector search
pip install faiss-cpu==1.12.0

# MCP client (for HTTP mode)
pip install aiohttp
```

### 5. Verify .env file:

Check that `.env` has correct values:
```bash
cat .env
```

**Required variables:**
```bash
# Zimyo API credentials
PARTNER_SECRET=9Rcn+AQ{l.hV2Wvnsls#4G
PARTNER_ID=228602
CLIENT_CODE=ZIMYO
AUTH_KEY=25a20c3e-beb6-11ed-9234-0123456789ab

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# DeepSeek API
DEEPSEEK_API_KEY=sk-e4d46cc7308c49e994edc0d5b8f9ed37

# MCP Configuration
USE_MCP_PROTOCOL=true
```

---

## Step 3: Setup Node.js Server (zimyo_api_server)

### 1. Navigate to Node.js project:
```bash
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_api_server"
```

### 2. Install Node.js dependencies:
```bash
npm install
```

**If package.json is missing dependencies, install manually:**
```bash
npm install express dotenv axios
```

### 3. Create .env file (if not exists):
```bash
cat > .env << 'EOF'
PORT=3000
PARTNER_SECRET=9Rcn+AQ{l.hV2Wvnsls#4G
PARTNER_ID=228602
CLIENT_CODE=ZIMYO
AUTH_KEY=25a20c3e-beb6-11ed-9234-0123456789ab
TOKEN_URL=https://apiserver.zimyo.com/apiv1/v1/token
EMPLOYEE_URL=https://apiserver.zimyo.com/apiv1/v1/org/employee-details
EOF
```

---

## Step 4: Run the Application

You have **2 options** depending on your setup:

### Option 1: Local Development (Recommended for Development)

**Python app will auto-spawn Node.js MCP server via stdio.**

1. **Start Python app only:**
```bash
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_ai_assistant"
source venv/bin/activate  # if not already activated
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

2. **That's it!** Python will automatically spawn the MCP server when needed.

**Access:**
- Python API: http://localhost:8080
- API Docs: http://localhost:8080/docs

---

### Option 2: Separate Servers (Recommended for Production)

**Run Python and Node.js servers separately.**

#### Terminal 1 - Start Node.js MCP Server:
```bash
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_api_server"
node src/mcp/server.js
```

**Or if you have a start script:**
```bash
npm start
```

#### Terminal 2 - Start Python FastAPI:
```bash
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_ai_assistant"
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Set environment variable for HTTP mode (optional)
export MCP_SERVER_URL=http://localhost:3000/mcp

# Run the app
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

**Access:**
- Python API: http://localhost:8080
- Node.js Server: http://localhost:3000
- API Docs: http://localhost:8080/docs

---

## Step 5: Verify Everything is Working

### 1. Check Redis:
```bash
redis-cli ping
# Should return: PONG
```

### 2. Check Python API:
```bash
curl http://localhost:8080/
# Should return: {"message":"Zimyo AI Assistant API is running"}
```

### 3. Check API Docs:
Open in browser: http://localhost:8080/docs

### 4. Test Login API:
```bash
curl -X POST "http://localhost:8080/login?userId=emp123&role=employee&userToken=test123"
```

---

## Common Issues & Solutions

### Issue 1: Redis Connection Error
```
Error: Redis connection refused
```

**Solution:**
```bash
# Start Redis
brew services start redis  # macOS
sudo systemctl start redis-server  # Linux

# Or use Docker
docker run -d -p 6379:6379 redis
```

---

### Issue 2: Python Module Not Found
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Activate virtual environment first!
source venv/bin/activate

# Then install dependencies
pip install -r requirements.txt
```

---

### Issue 3: Port Already in Use
```
Error: Address already in use
```

**Solution:**
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>

# Or use different port
uvicorn app:app --host 0.0.0.0 --port 8081
```

---

### Issue 4: MCP Server Not Found
```
Error: MCP server path not found
```

**Solution:**

**Option A:** Set correct path in `.env`:
```bash
MCP_SERVER_PATH=/Users/akashtyagi/Documents/code/zimyo ai/zimyo_api_server/src/mcp/server.js
```

**Option B:** Use HTTP mode instead:
```bash
# In terminal 1: Start Node server
cd zimyo_api_server
npm start

# In terminal 2: Set HTTP mode
export MCP_SERVER_URL=http://localhost:3000/mcp
uvicorn app:app --host 0.0.0.0 --port 8080
```

---

### Issue 5: Missing aiohttp for HTTP MCP Client
```
ModuleNotFoundError: No module named 'aiohttp'
```

**Solution:**
```bash
pip install aiohttp
```

---

## Environment Variables Reference

### Python (.env in zimyo_ai_assistant/):
```bash
# Zimyo API
PARTNER_SECRET=9Rcn+AQ{l.hV2Wvnsls#4G
PARTNER_ID=228602
CLIENT_CODE=ZIMYO
AUTH_KEY=25a20c3e-beb6-11ed-9234-0123456789ab
TOKEN_URL=https://apiserver.zimyo.com/apiv1/v1/token
EMPLOYEE_URL=https://apiserver.zimyo.com/apiv1/v1/org/employee-details

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# DeepSeek API
DEEPSEEK_API_KEY=sk-e4d46cc7308c49e994edc0d5b8f9ed37

# MCP Configuration
USE_MCP_PROTOCOL=true

# Optional: For HTTP mode
# MCP_SERVER_URL=http://localhost:3000/mcp
# MCP_AUTH_TOKEN=your_secret_token
# MCP_TIMEOUT=30

# Optional: Custom MCP server path
# MCP_SERVER_PATH=/absolute/path/to/zimyo_api_server/src/mcp/server.js
```

### Node.js (.env in zimyo_api_server/):
```bash
PORT=3000
PARTNER_SECRET=9Rcn+AQ{l.hV2Wvnsls#4G
PARTNER_ID=228602
CLIENT_CODE=ZIMYO
AUTH_KEY=25a20c3e-beb6-11ed-9234-0123456789ab
TOKEN_URL=https://apiserver.zimyo.com/apiv1/v1/token
EMPLOYEE_URL=https://apiserver.zimyo.com/apiv1/v1/org/employee-details
```

---

## Quick Start Commands

### Development (Simplest):
```bash
# Terminal 1
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_ai_assistant"
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

### Production (Separate Servers):
```bash
# Terminal 1 - Node.js
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_api_server"
npm start

# Terminal 2 - Python
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_ai_assistant"
source venv/bin/activate
export MCP_SERVER_URL=http://localhost:3000/mcp
uvicorn app:app --host 0.0.0.0 --port 8080
```

---

## API Endpoints

Once running, you can use these endpoints:

### 1. Root
```bash
GET http://localhost:8080/
```

### 2. Login (Required First)
```bash
POST http://localhost:8080/login
Query Params:
  - userId: string
  - role: "employee" | "manager"
  - userToken: string
```

### 3. Chat
```bash
POST http://localhost:8080/chat
Body:
{
  "userId": "emp123",
  "message": "Apply leave tomorrow",
  "sessionId": "optional-session-id",
  "context": {}
}
```

### 4. Create Session
```bash
POST http://localhost:8080/sessions/create
Body:
{
  "userId": "emp123",
  "sessionName": "My Session"
}
```

### 5. Get Sessions
```bash
GET http://localhost:8080/sessions/{userId}
```

---

## Testing the Application

### 1. Test with cURL:

**Login:**
```bash
curl -X POST "http://localhost:8080/login?userId=emp123&role=employee&userToken=test123"
```

**Chat:**
```bash
curl -X POST "http://localhost:8080/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "emp123",
    "message": "What is my leave balance?"
  }'
```

### 2. Test with Postman:
Import the endpoints from http://localhost:8080/docs

### 3. Test with Swagger UI:
Open http://localhost:8080/docs in browser and test interactively

---

## Development Tips

### Hot Reload (Auto-restart on code changes):
```bash
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

### Debug Mode:
```bash
# Add logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Check Logs:
```bash
# Python logs show in terminal
# Check for errors in the console output
```

---

## Production Deployment

For production deployment, see:
- `MCP_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `SETUP_SEPARATE_HOSTING.md` - Setup for separate servers

---

## Summary

**Quickest way to run:**

```bash
# 1. Start Redis (if not running)
brew services start redis  # macOS
# OR
sudo systemctl start redis-server  # Linux

# 2. Install Python dependencies (first time only)
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_ai_assistant"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Run the app
uvicorn app:app --host 0.0.0.0 --port 8080 --reload

# 4. Open browser
# http://localhost:8080/docs
```

**That's it!** 🚀

Your Zimyo AI Assistant is now running!

---

## Need Help?

- Check documentation: `SERVICES_REFACTORING_COMPLETE.md`
- MCP setup: `MCP_DEPLOYMENT_GUIDE.md`
- Architecture: `REFACTORING_COMPLETE_SUMMARY.md`

**Common Issues:** See "Common Issues & Solutions" section above.
