# Quick Setup Guide: Separate Hosting for Python and Node.js Services

## Problem Solved

Aapka point bilkul sahi tha! Purani MCP client mein:
```python
server_path = str(current_dir.parent / "zimyo_api_server" / "src" / "mcp" / "server.js")
```

Yeh approach fail hota agar `zimyo_api_server` alag machine pe host ho.

## Solution

Ab hum **HTTP-based MCP client** use kar rahe hain jo **2 modes** support karta hai:
1. **Local mode (stdio)** - Development ke liye (default)
2. **HTTP mode** - Production ke liye (remote hosting) ✅

---

## Quick Setup (5 Steps)

### Step 1: Update Node.js Server

**File: `zimyo_api_server/src/app.js`**

Add MCP routes:

```javascript
const express = require('express');
const mcpRoutes = require('./routes/mcp.routes');

const app = express();

// Body parser
app.use(express.json());

// MCP HTTP endpoint
app.use(mcpRoutes);  // ✅ Add this line

// ... other routes

module.exports = app;
```

**File: `zimyo_api_server/.env`**

```bash
# Server port
PORT=3000

# MCP Authentication (important for security)
MCP_AUTH_TOKEN=your_production_secret_token_here

# Other configs
NODE_ENV=production
```

### Step 2: Update Python Service

**File: `zimyo_ai_assistant/.env`**

For separate hosting, add:

```bash
# MCP Server Configuration
MCP_SERVER_URL=http://your-nodejs-server.com:3000/mcp
MCP_AUTH_TOKEN=your_production_secret_token_here
MCP_TIMEOUT=30

# Keep other configs
USE_MCP_PROTOCOL=true
```

**For local development**, don't set `MCP_SERVER_URL`:

```bash
# MCP Server Configuration
# MCP_SERVER_URL=  # Leave empty or comment out for local mode
MCP_TIMEOUT=30

USE_MCP_PROTOCOL=true
```

### Step 3: Install Dependencies

**Python service:**

```bash
cd zimyo_ai_assistant
pip install aiohttp  # For HTTP requests
```

**Node.js service:**

```bash
cd zimyo_api_server
npm install express  # Should already be installed
```

### Step 4: Start Services

**Development (same machine):**

```bash
# Terminal 1: Python service (will use stdio mode automatically)
cd zimyo_ai_assistant
python app.py

# Terminal 2: Not needed - MCP spawns Node.js automatically
```

**Production (separate machines):**

```bash
# On Node.js server:
cd zimyo_api_server
npm start
# or with PM2:
pm2 start src/app.js --name "zimyo-api"

# On Python server:
cd zimyo_ai_assistant
python app.py
# or with gunicorn:
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app
```

### Step 5: Test

**Test Node.js MCP endpoint:**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_production_secret_token_here" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_leave_types",
      "arguments": {"user_id": "test123"}
    }
  }'
```

**Expected response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"status\":\"success\",\"leave_types\":[...]}"
    }]
  }
}
```

---

## Deployment Examples

### Example 1: AWS EC2 (Separate Instances)

**Node.js Server (EC2 Instance 1):**
- Public IP: `3.15.123.45`
- Port: `3000`

```bash
# .env
PORT=3000
MCP_AUTH_TOKEN=aws_prod_token_xyz789
```

**Python Server (EC2 Instance 2):**

```bash
# .env
MCP_SERVER_URL=http://3.15.123.45:3000/mcp
MCP_AUTH_TOKEN=aws_prod_token_xyz789
```

### Example 2: Docker Compose

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  # Node.js API Server
  api-server:
    build: ./zimyo_api_server
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - MCP_AUTH_TOKEN=docker_secret_token
    networks:
      - app-network

  # Python AI Assistant
  ai-assistant:
    build: ./zimyo_ai_assistant
    ports:
      - "8080:8080"
    environment:
      - MCP_SERVER_URL=http://api-server:3000/mcp
      - MCP_AUTH_TOKEN=docker_secret_token
    depends_on:
      - api-server
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

Start:

```bash
docker-compose up -d
```

### Example 3: Kubernetes

**Node.js Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api-server
        image: zimyo-api-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: MCP_AUTH_TOKEN
          valueFrom:
            secretKeyRef:
              name: mcp-secret
              key: token

---
apiVersion: v1
kind: Service
metadata:
  name: api-server-service
spec:
  selector:
    app: api-server
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

**Python Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-assistant
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-assistant
  template:
    metadata:
      labels:
        app: ai-assistant
    spec:
      containers:
      - name: ai-assistant
        image: zimyo-ai-assistant:latest
        ports:
        - containerPort: 8080
        env:
        - name: MCP_SERVER_URL
          value: "http://api-server-service:3000/mcp"
        - name: MCP_AUTH_TOKEN
          valueFrom:
            secretKeyRef:
              name: mcp-secret
              key: token
```

---

## Troubleshooting

### Issue: "Module 'aiohttp' not found"

```bash
cd zimyo_ai_assistant
pip install aiohttp
```

### Issue: "Cannot find module '../mcp/server'"

Check that `zimyo_api_server/src/routes/mcp.routes.js` correctly imports:

```javascript
const { MCPServer } = require('../mcp/server');
```

Verify path based on your directory structure.

### Issue: Connection refused

1. Check Node.js server is running:
   ```bash
   curl http://localhost:3000/mcp/health
   ```

2. Check firewall:
   ```bash
   # On Node.js server
   sudo ufw status
   sudo ufw allow 3000
   ```

3. Check MCP_SERVER_URL:
   ```bash
   echo $MCP_SERVER_URL
   ```

### Issue: 401 Unauthorized

Tokens don't match! Check:

```bash
# Python .env
cat zimyo_ai_assistant/.env | grep MCP_AUTH_TOKEN

# Node.js .env
cat zimyo_api_server/.env | grep MCP_AUTH_TOKEN

# Must be identical!
```

---

## Performance Tips

### 1. Use Connection Pooling

Python service already uses `aiohttp.ClientSession` which pools connections.

### 2. Enable Keep-Alive

In Node.js, enable keep-alive:

```javascript
// app.js
const app = express();
app.use((req, res, next) => {
    res.setHeader('Connection', 'keep-alive');
    next();
});
```

### 3. Add Caching

Cache leave types (they don't change often):

```python
# Python side
from functools import lru_cache
import asyncio

@lru_cache(maxsize=100)
def get_cached_leave_types(user_id: str):
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(mcp_client.get_leave_types(user_id))
```

### 4. Monitor Response Times

Add monitoring:

```javascript
// Node.js
router.post('/mcp', async (req, res) => {
    const start = Date.now();
    // ... handle request
    const duration = Date.now() - start;
    console.log(`MCP request took ${duration}ms`);
});
```

---

## Security Checklist

- [ ] Use HTTPS in production (`https://` not `http://`)
- [ ] Set strong `MCP_AUTH_TOKEN` (32+ characters)
- [ ] Enable firewall rules (allow only Python server IP)
- [ ] Add rate limiting (see deployment guide)
- [ ] Don't commit `.env` files to Git
- [ ] Rotate tokens regularly
- [ ] Monitor for unusual traffic
- [ ] Use environment variables, not hardcoded values

---

## Summary

### Before:
```
❌ Services must be on same machine
❌ Hard-coded file path: zimyo_api_server/src/mcp/server.js
❌ Can't deploy separately
```

### After:
```
✅ Services can be on different machines
✅ HTTP communication with environment variable
✅ Automatic fallback to local mode for development
✅ Production-ready with authentication
```

---

## Need Help?

See complete guide: `MCP_DEPLOYMENT_GUIDE.md`

**Key Environment Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `MCP_SERVER_URL` | Remote MCP server URL | `http://api.example.com:3000/mcp` |
| `MCP_AUTH_TOKEN` | Authentication token | `your_secret_token_here` |
| `MCP_TIMEOUT` | Request timeout (seconds) | `30` |

**Default Behavior:**
- If `MCP_SERVER_URL` is set → HTTP mode (remote)
- If `MCP_SERVER_URL` is NOT set → Stdio mode (local)

**Files Created:**
1. ✅ `zimyo_ai_assistant/services/http_mcp_client.py` - New HTTP-capable client
2. ✅ `zimyo_api_server/src/routes/mcp.routes.js` - HTTP endpoint
3. ✅ `MCP_DEPLOYMENT_GUIDE.md` - Complete documentation
4. ✅ `SETUP_SEPARATE_HOSTING.md` - This quick guide
