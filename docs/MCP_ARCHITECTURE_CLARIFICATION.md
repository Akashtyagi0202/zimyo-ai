# MCP Architecture Clarification

## Question: Dono Repos Mein MCP Server Hai Kya?

**Answer**: **NAHI!** Sirf ek repo mein MCP Server hai.

## Correct Architecture ✅

### Repo 1: zimyo_api_server (Node.js)
**Contains**: MCP SERVER ⚙️

```
zimyo_api_server/
└── src/mcp/
    ├── server.js              ← ACTUAL MCP SERVER
    ├── handlers/
    │   ├── base.handler.js
    │   ├── attendance.handler.js
    │   └── leave.handler.js
    └── ARCHITECTURE.md
```

**Role**: Provides MCP tools (mark_attendance, apply_leave, etc.)

### Repo 2: zimyo_ai_assistant (Python)
**Contains**: MCP CLIENT 🔌

```
zimyo_ai_assistant/
└── services/
    ├── mcp_client.py          ← MCP CLIENT (connects to server)
    └── mcp_integration.py     ← Integration logic (not a server!)
```

**Role**: Uses MCP tools from the server

## Visual Explanation

```
┌─────────────────────────────────────┐
│   zimyo_ai_assistant (Python)       │
│   CLIENT SIDE                        │
│                                      │
│   services/                          │
│   ├── mcp_client.py                 │  ← CLIENT
│   │   └── Spawns MCP server process │
│   │                                  │
│   └── mcp_integration.py            │  ← Integration logic
│       └── Uses mcp_client            │
│                                      │
└──────────────┬──────────────────────┘
               │
               │ Spawns process
               │ MCP Protocol (stdio)
               │
┌──────────────▼──────────────────────┐
│   zimyo_api_server (Node.js)        │
│   SERVER SIDE                        │
│                                      │
│   src/mcp/                           │
│   ├── server.js                     │  ← SERVER
│   │   └── Main MCP server           │
│   │                                  │
│   └── handlers/                     │
│       ├── attendance.handler.js     │  ← Provides tools
│       └── leave.handler.js          │  ← Provides tools
│                                      │
└─────────────┬───────────────────────┘
              │
              ▼
         Zimyo API
```

## What Each File Does

### zimyo_api_server (Server Side)

#### 1. `src/mcp/server.js` ⚙️
```javascript
// THE ACTUAL MCP SERVER
class ZimyoMCPServer {
  constructor() {
    this.handlers = {
      attendance: new AttendanceHandler(),
      leave: new LeaveHandler()
    };
  }

  async run() {
    // Listens on stdin/stdout for MCP protocol
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

**Purpose**: The MCP server that listens for requests

#### 2. `src/mcp/handlers/*.handler.js` 🛠️
```javascript
// TOOLS PROVIDED BY SERVER
class AttendanceHandler {
  getTools() {
    return [
      {name: 'mark_attendance', ...},
      {name: 'get_attendance_report', ...}
    ];
  }

  async handleTool(name, args) {
    // Execute the tool
  }
}
```

**Purpose**: Define and handle MCP tools

### zimyo_ai_assistant (Client Side)

#### 1. `services/mcp_client.py` 🔌
```python
# MCP CLIENT - Connects to server
class MCPClient:
    def __init__(self):
        self.server_path = "../zimyo_api_server/src/mcp/server.js"

    async def call_tool(self, tool_name, arguments):
        # Spawns MCP server process
        process = await asyncio.create_subprocess_exec(
            'node', self.server_path,
            stdin=PIPE, stdout=PIPE
        )

        # Sends MCP request via stdin
        request = {"method": "tools/call", "params": {...}}
        stdout, _ = await process.communicate(input=json.dumps(request))

        # Returns response
        return json.loads(stdout)
```

**Purpose**: Client that spawns and talks to MCP server

#### 2. `services/mcp_integration.py` 🔗
```python
# INTEGRATION LOGIC - Not a server!
class HRMSAdapter:
    def __init__(self):
        if USE_MCP:
            self.client = get_mcp_client()  # Uses MCP client
        else:
            self.client = node_api_client   # Uses HTTP client

    async def call_tool(self, tool_name, arguments):
        # Routes to MCP or HTTP
        return await self.client.call_tool(tool_name, arguments)
```

**Purpose**: Adapter that chooses between MCP or HTTP

## Common Confusion 🤔

### Confusion 1: "mcp_integration.py is a server?"
**NO!** It's integration logic, not a server.

```python
# mcp_integration.py - NOT A SERVER
# It's an adapter that USES the MCP client
class HRMSAdapter:  # Adapter, not server
    def __init__(self):
        self.client = get_mcp_client()  # Uses client
```

### Confusion 2: "Python has MCP server code?"
**NO!** The `.venv` packages are just libraries, not our server.

```
.venv/lib/python3.13/site-packages/mcp/server/  ← Library code
                                                   (not our server)
```

Our actual server is:
```
zimyo_api_server/src/mcp/server.js  ← Our actual server
```

### Confusion 3: "Do I need two MCP servers?"
**NO!** One server, one client.

```
Server (1):  zimyo_api_server/src/mcp/server.js
Client (1):  zimyo_ai_assistant/services/mcp_client.py

Total servers: 1 ✓
```

## How It Works - Step by Step

### Step 1: User Request
```python
# In Python code
result = await mcp_client.call_tool("mark_attendance", {
    "user_id": "emp123"
})
```

### Step 2: Client Spawns Server
```python
# mcp_client.py
process = await asyncio.create_subprocess_exec(
    'node',
    '../zimyo_api_server/src/mcp/server.js',  # ← Spawns THIS
    stdin=PIPE, stdout=PIPE
)
```

### Step 3: Server Starts
```javascript
// server.js starts
const server = new ZimyoMCPServer();
server.run();  // Listens on stdin/stdout
```

### Step 4: Client Sends Request
```python
# Send MCP request via stdin
request = {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
        "name": "mark_attendance",
        "arguments": {"user_id": "emp123"}
    }
}
process.stdin.write(json.dumps(request))
```

### Step 5: Server Handles Request
```javascript
// server.js receives request
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const {name, arguments} = request.params;
    return await this.executeTool(name, arguments);  // Calls handler
});
```

### Step 6: Handler Executes
```javascript
// attendance.handler.js
async handleTool(toolName, args) {
    if (toolName === 'mark_attendance') {
        return await this.handleMarkAttendance(args);  // Execute
    }
}
```

### Step 7: Response Back to Client
```javascript
// server.js sends response via stdout
return {
    "result": {
        "content": [{
            "type": "text",
            "text": JSON.stringify({status: "success", ...})
        }]
    }
};
```

### Step 8: Client Receives Response
```python
# mcp_client.py reads from stdout
stdout, _ = await process.communicate()
response = json.loads(stdout)
return response  # Returns to user
```

## Summary

### What Each Repo Has

| Repo | Has | Role |
|------|-----|------|
| **zimyo_api_server** | MCP Server | **Provides** tools |
| **zimyo_ai_assistant** | MCP Client | **Uses** tools |

### File Purposes

| File | Type | Purpose |
|------|------|---------|
| `zimyo_api_server/src/mcp/server.js` | **Server** | Listens and provides tools |
| `zimyo_api_server/src/mcp/handlers/*.js` | **Tools** | Define tool implementations |
| `zimyo_ai_assistant/services/mcp_client.py` | **Client** | Connects to server |
| `zimyo_ai_assistant/services/mcp_integration.py` | **Adapter** | Integration logic |

### Process Flow

```
1. Python code calls mcp_client.call_tool()
   └── Client spawns Node.js process

2. Node.js process runs server.js
   └── Server starts listening on stdin/stdout

3. Client sends MCP request via stdin
   └── JSON-RPC format

4. Server receives and routes to handler
   └── Handler executes tool

5. Handler returns result
   └── JSON format

6. Server sends response via stdout
   └── MCP protocol format

7. Client receives and parses response
   └── Returns to Python code

8. Process terminates
   └── Clean exit
```

## Key Points

1. ✅ **One Server**: `zimyo_api_server/src/mcp/server.js`
2. ✅ **One Client**: `zimyo_ai_assistant/services/mcp_client.py`
3. ✅ **Client spawns server**: On demand, per request
4. ✅ **Communication**: stdio (stdin/stdout)
5. ✅ **Protocol**: MCP (Model Context Protocol)

## Do You Need Both Repos?

**YES**, but for different reasons:

### zimyo_api_server
**Need**: Yes ✅
**Reason**: Contains the MCP server and HRMS business logic

### zimyo_ai_assistant
**Need**: Yes ✅
**Reason**: Contains the AI assistant and MCP client

**Both repos work together**:
- **AI Assistant** (Python) uses **MCP Client** to call
- **MCP Server** (Node.js) which executes
- **HRMS operations** via **Controllers**

## Analogy

Think of it like a phone call:

```
zimyo_ai_assistant = Person making the call 📱
  └── mcp_client.py = Phone dialer

zimyo_api_server = Person receiving the call 📞
  └── server.js = Phone receiver
  └── handlers/ = Actions they can perform
```

You need **both sides** for a call to work!

## Conclusion

**Question**: Dono repos mein MCP server hai?
**Answer**: NAHI!

- **Server**: Only in `zimyo_api_server` (Node.js)
- **Client**: Only in `zimyo_ai_assistant` (Python)
- **Both needed**: Yes, they work together

**Architecture**: Client → Server (not Server → Server)

---

**Clear Now?** ✅

One server (Node.js) provides tools.
One client (Python) uses those tools.
Both repos needed, different roles!
