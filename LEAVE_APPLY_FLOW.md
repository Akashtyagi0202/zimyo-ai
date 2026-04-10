# "Apply My Leave" - Complete Code Execution Flow

Jab employee chat mein likhta hai **"apply my leave"**, tab neeche diye gaye steps mein code execute hota hai.

---

## Flow Diagram (Overview)

```
Employee types "apply my leave"
        |
        v
+-------------------+
|  Frontend (React) |  ---->  POST /chat API call
+-------------------+
        |
        v
+-------------------------+
|  FastAPI Server (Python) |  ---->  Date parsing + Agent classification
+-------------------------+
        |
        v
+---------------------------+
|  LangGraph State Machine  |
|  +-----------------------+|
|  | 1. route_sub_flow     ||  ---->  Decide karna: leave apply / balance check / duty
|  +-----------------------+|
|  | 2. collect_leave_info ||  ---->  LLM se fields extract karna (multi-turn)
|  +-----------------------+|
|  | 3. confirm_node       ||  ---->  User se "yes/no" confirm karna (PAUSE)
|  +-----------------------+|
|  | 4. submit_leave       ||  ---->  Zimyo API call karna
|  +-----------------------+|
+---------------------------+
        |
        v
+-------------------+       +-------------------+       +------------------+
|  MCP Client (Py)  | ----> |  MCP Server (Node) | ----> |  Zimyo HRMS API  |
+-------------------+       +-------------------+       +------------------+
        |
        v
  Response back to Frontend ---->  User ko message dikhana
```

---

## Step 1: Frontend - User Message Send

**File:** `zimyo_ai_frontend/src/pages/Chat.jsx` (line ~118)
**File:** `zimyo_ai_frontend/src/api/client.js` (line ~25)

**Kya hota hai:**
- Employee chat box mein "apply my leave" type karta hai aur send button dabata hai
- `handleSend()` function trigger hota hai
- Ye function backend ko HTTP POST request bhejta hai `/chat` endpoint pe

**Data jo bheja jata hai:**
```json
{
  "userId": "233970",
  "message": "apply my leave",
  "sessionId": "session-abc-123"
}
```

**Kaam:** User ka message backend tak pahunchana

---

## Step 2: FastAPI Server - Request Receive

**File:** `zimyo_ai_assistant/hrms_agents/main.py` (line ~94)

```python
@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
```

**Kya hota hai:**
- FastAPI server pe `/chat` endpoint request receive karta hai
- `employee_id`, `message`, aur `session_id` extract hote hain

**Kaam:** Request ko receive karna aur processing shuru karna

---

## Step 3: Date Parsing - Relative Dates Resolve

**File:** `zimyo_ai_assistant/hrms_agents/tools/date_parser.py` (line ~30)

```python
message = resolve_relative_dates(req.message)
```

**Kya hota hai:**
- Agar user ne "today", "tomorrow", "kal", "aaj", "parso" likha hai to usse actual date mein convert karta hai
- Example: "apply leave tomorrow" → "apply leave 2026-04-10"

**Kaam:** Hindi/English relative dates ko YYYY-MM-DD format mein badalna

---

## Step 4: HITL Interrupt Check

**File:** `zimyo_ai_assistant/hrms_agents/main.py` (line ~108)

```python
for agent_name, agent_graph in ROUTING_REGISTRY.items():
    config = {"configurable": {"thread_id": f"{req.employee_id}:{agent_name}"}}
    if _is_interrupted(agent_graph, config):
        # Resume paused graph
        agent_graph.invoke(...)
```

**Kya hota hai:**
- Check karta hai ki kya pehle se koi conversation pause pe hai (jaise confirm_node pe ruka ho)
- Agar ruka hai to wahi se resume karta hai (Step 12 pe jaata hai)
- Agar nahi ruka to aage badhta hai

**Thread ID format:** `"233970:leave_attendance"`

**Kaam:** Multi-turn conversation ko support karna - pehle se chalu conversation ko resume karna

---

## Step 5: Agent Classification (Routing)

**File:** `zimyo_ai_assistant/hrms_agents/supervisor.py` (line ~69)

```python
agent_name = classify_agent(message)  # Returns "leave_attendance"
agent_graph = ROUTING_REGISTRY[agent_name]
```

**Kya hota hai:**
- Message ko classify karta hai ki ye kis agent ko jaana chahiye
- **Pehle LLM try hota hai** (Gemini/OpenAI) - message ka intent samajhne ke liye
- **Agar LLM fail ho** to keyword matching hoti hai:
  - `(apply|request|take|book).*(leave|chutti)` → "leave_attendance"
  - Policy related → "policy"
- "apply my leave" → **"leave_attendance"** agent select hota hai

**Kaam:** Decide karna ki message ko kaunsa agent handle karega

---

## Step 6: State Initialization

**File:** `zimyo_ai_assistant/hrms_agents/state.py` (line ~28)
**File:** `zimyo_ai_assistant/hrms_agents/main.py` (line ~129)

**Kya hota hai:**
- LangGraph ke liye initial state create hota hai jismein sab fields empty hain:

```python
{
    "messages": [HumanMessage("apply my leave")],
    "employee_id": "233970",
    "agent_name": "leave_attendance",
    "sub_flow": "",           # abhi decide nahi hua
    "next_step": "start",
    
    # Leave fields (sab khali)
    "leave_type": "",         # Sick/Casual/Earned
    "start_date": "",         # kab se
    "end_date": "",           # kab tak
    "leave_reason": "",       # kyun chahiye
    "is_half_day": "0",       # half day ya full day
    
    "confirmed": False,
    "api_result": ""
}
```

**Kaam:** Graph execution ke liye initial data structure tayyar karna

---

## Step 7: Graph Invoke - Execution Shuru

**File:** `zimyo_ai_assistant/hrms_agents/main.py` (line ~153)

```python
agent_graph.invoke(initial_state, config)
```

**Kya hota hai:**
- LangGraph compiled graph ko invoke karta hai
- Graph ka checkpointer Redis hai - har node ke baad state save hoti hai
- Graph mein `interrupt_before=["confirm_node"]` set hai - confirm_node se pehle graph ruk jaayega

**Kaam:** LangGraph state machine ko start karna

---

## Step 8: Node 1 - Route Sub-Flow

**File:** `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/graph.py` (line ~23)

```python
async def route_sub_flow(state: LeaveAttendanceState) -> dict:
```

**Kya hota hai:**
- Message analyze karke decide karta hai ki leave_attendance ke andar kaunsa sub-flow chalana hai:
  - `"leave_apply"` → leave lagani hai
  - `"balance_check"` → leave balance dekhna hai
  - `"duty_apply"` → on-duty/WFH lagana hai
  - `"holiday_check"` → holidays dekhne hain
- "apply my leave" ke liye → **`sub_flow = "leave_apply"`**

**Conditional edge routing:**
```python
"leave_apply" → collect_leave node pe jaao
"balance_check" → fetch_balance node pe jaao
"duty_apply" → collect_duty node pe jaao
```

**Kaam:** Leave-related sub-task identify karna

---

## Step 9: Node 2 - Collect Leave Info (LLM Extraction)

**File:** `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/nodes/leave_apply.py` (line ~80)

```python
async def collect_leave_info(state: dict) -> dict:
```

**Ye sabse important node hai - yahan multi-turn conversation hoti hai.**

### 9a. LLM ko Prompt Bhejte Hain

**File:** `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/nodes/leave_apply.py` (line ~14)
**File:** `zimyo_ai_assistant/hrms_agents/tools/llm_extract.py` (line ~16)

Prompt mein few-shot examples hote hain:
```
MSG: "apply my leave"
YEAR: 2026

Extract:
- leave_type: (Sick Leave / Casual Leave / Earned Leave)
- from_date: YYYY-MM-DD
- to_date: YYYY-MM-DD
- reason: text
- is_half_day: "0"=full, "1"=first half, "2"=second half

EXAMPLES:
"apply sick leave 4 nov health issues" → {"leave_type":"Sick Leave","from_date":"2026-11-04",...}
"chutti chahiye bimar hu" → {"leave_type":"Sick Leave",...}
```

LLM (Gemini Flash by default) JSON mode mein response deta hai.

### 9b. Missing Fields Check

"apply my leave" mein koi specific detail nahi hai, to LLM return karega:
```json
{
  "extracted_data": {},
  "missing_fields": ["leave_type", "date", "reason"],
  "next_question": "Kaunsi leave apply karni hai? (Sick, Casual, Earned)"
}
```

### 9c. Missing Fields Hain → User se Puchho

```python
if missing:
    return {
        "messages": [AIMessage(content=next_question)],
        "next_step": "collect"   # isi node pe wapas aao
    }
```

Graph wapas isi node pe aata hai jab user reply karta hai.

### 9d. Multi-Turn Example

```
Bot:  "Kaunsi leave apply karni hai? (Sick, Casual, Earned)"
User: "sick leave"           → leave_type extract hua
Bot:  "Kis date se kis date tak?"
User: "tomorrow"             → date resolve + extract hua
Bot:  "Reason kya hai?"
User: "health issues"        → reason extract hua
```

Har turn mein previous data merge hota hai:
```python
data = {**prev_data, **new_extracted_data}
```

### 9e. Sab Fields Complete → Confirmation Summary

Jab sabhi required fields mil jaayein:

```python
summary = """Please confirm your leave:

  Type: Sick Leave
  From: 2026-04-10
  To: 2026-04-10
  Reason: health issues

Reply 'yes' to submit or 'no' to cancel."""

return {
    "leave_type": "Sick Leave",
    "start_date": "2026-04-10",
    "end_date": "2026-04-10",
    "leave_reason": "health issues",
    "messages": [AIMessage(content=summary)],
    "next_step": "confirm"
}
```

**Kaam:** LLM se leave details extract karna, missing info puchna, aur confirmation summary banana

---

## Step 10: Node 3 - Confirm Node (HITL Pause)

**File:** `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/graph.py` (line ~57)

```python
async def confirm_node(state: LeaveAttendanceState) -> dict:
    """Graph yahan PAUSE hota hai. User ke yes/no ka wait."""
    return {}
```

**Kya hota hai:**
- Graph yahan **ruk jaata hai** (`interrupt_before=["confirm_node"]`)
- Poori state Redis mein save ho jaati hai (checkpointer)
- Frontend ko response jaata hai status `"waiting_confirmation"` ke saath
- **User ko confirmation message dikhta hai**

**Checkpointer:** `zimyo_ai_assistant/hrms_agents/checkpointer.py`
- Redis key: `"233970:leave_attendance"`

**Kaam:** User se final confirmation lena before actually leave apply karna

---

## Step 11: User Confirms "Yes"

**Frontend se wapas POST /chat aata hai message "yes" ke saath**

**File:** `zimyo_ai_assistant/hrms_agents/main.py` (line ~113)

```python
if _is_interrupted(agent_graph, config):
    agent_graph.invoke(
        Command(resume=HumanMessage(content="yes")),
        config
    )
```

**Kya hota hai:**
- Step 4 wala HITL check ab `True` return karta hai
- Graph wahi se resume hota hai jahan ruka tha (confirm_node)
- "yes" message state mein add hota hai
- confirm_node execute hota hai (empty return) aur aage badhta hai

**Kaam:** Paused graph ko resume karna user ke confirmation ke baad

---

## Step 12: Node 4 - Submit Leave (API Call)

**File:** `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/nodes/leave_apply.py` (line ~131)

```python
async def submit_leave(state: dict) -> dict:
    last = state["messages"][-1].content.strip().lower()  # "yes"
    
    if last in ("no", "nahi", "cancel"):
        return {"messages": [AIMessage(content="Leave cancelled.")]}
    
    # API call
    r = await apply_leave(
        employee_id=state["employee_id"],
        leave_type=state["leave_type"],
        from_date=state["start_date"],
        to_date=state["end_date"],
        reason=state["leave_reason"],
        is_half_day=state.get("is_half_day", "0")
    )
```

**Agar "no/cancel" bola** → leave cancel ho jaati hai, graph END pe jaata hai.

**Agar "yes" bola** → `apply_leave()` function call hota hai (neeche ka flow).

**Kaam:** User ke confirmation ke baad actual leave API call trigger karna

---

## Step 13: MCP Client - HRMS API Call

**File:** `zimyo_ai_assistant/hrms_agents/tools/hrms_api.py` (line ~24)

```python
async def apply_leave(employee_id, leave_type, from_date, to_date, reason, is_half_day):
    mcp = _mcp()  # MCP Client singleton
    
    # Step 1: Validate leave request
    val = await mcp.call_tool("validate_leave_request", {
        "user_id": employee_id,
        "leave_type_name": leave_type,
        "from_date": from_date,
        "to_date": to_date,
    })
    
    # Step 2: Agar valid hai to apply karo
    res = await mcp.call_tool("apply_leave", {
        "user_id": employee_id,
        "leave_type_name": leave_type,
        "from_date": from_date,
        "to_date": to_date,
        "reasons": reason,
        "is_half_day": is_half_day,
    })
```

**Kaam:** MCP protocol ke through Node.js server ko tool call bhejta hai (pehle validate, phir apply)

---

## Step 14: MCP Client → MCP Server Communication

**File:** `zimyo_ai_assistant/services/integration/mcp_client.py` (line ~60)

```python
request = {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
        "name": "apply_leave",
        "arguments": {...}
    }
}

# HTTP POST to Node.js MCP Server
async with session.post(self.server_url, json=request) as response:
    return response.json()
```

**Communication modes:**
1. **HTTP mode (primary):** POST request to MCP server URL
2. **Stdio mode (fallback):** Agar HTTP fail ho to local Node.js subprocess spawn hota hai

**Kaam:** Python se Node.js server tak data pahunchana MCP protocol ke through

---

## Step 15: MCP Server - Tool Routing

**File:** `zimyo_api_server/src/mcp/server.js` (line ~170)

```javascript
class ZimyoMCPServer {
    async executeTool(toolName, args) {
        // "apply_leave" → LeaveHandler ko bhejo
        return await handler.handleTool(toolName, args);
    }
}
```

**Kaam:** MCP request receive karke sahi handler ko route karna

---

## Step 16: Leave Handler

**File:** `zimyo_api_server/src/mcp/handlers/leave.handler.js` (line ~84)

```javascript
async handleTool(toolName, args) {
    switch (toolName) {
        case 'apply_leave':
            return await this.handleApplyLeave(args);
        case 'validate_leave_request':
            return await this.handleValidateLeaveRequest(args);
    }
}

async handleApplyLeave(args) {
    const mockReq = this.createMockRequest({
        user_id: args.user_id,
        leave_type_name: args.leave_type_name,
        from_date: args.from_date,
        to_date: args.to_date,
        reasons: args.reasons,
        is_half_day: args.is_half_day,
    });
    
    return await this.executeController(this.controller.applyLeave, mockReq);
}
```

**Kaam:** MCP tool call ko controller function mein convert karna

---

## Step 17: Leave Controller (Business Logic)

**File:** `zimyo_api_server/src/controllers/leave.controller.js` (line ~1)

```javascript
applyLeave = async (req, res) => {
    const { user_id, leave_type_name, from_date, to_date, reasons, is_half_day } = req.body;
    
    // 1. Required fields validate karo
    if (!user_id || !leave_type_name || !from_date || !to_date || !reasons) {
        return res.status(400).json({ status: 'error', message: 'Missing fields' });
    }
    
    // 2. Redis se session data lao (token + leave balances)
    const sessionData = await getSessionData(user_id);
    const authToken = sessionData.token;
    
    // 3. Leave type name se leave type ID find karo
    let leaveTypeId = zimyoService.findLeaveTypeId(sessionData, leave_type_name);
    // "Sick Leave" → ID: 1
    
    // 4. Zimyo API call karo
    const result = await zimyoService.makeApiCall(
        'leave/applyleave',
        { leave_type: leaveTypeId, reasons, from_date, to_date, is_half_day },
        authToken
    );
    
    return res.json({
        status: 'success',
        message: 'Leave application submitted successfully',
        days_requested: 1,
        date_range: '2026-04-10 to 2026-04-10'
    });
};
```

**Kaam:** Business logic - validation, session lookup, leave type ID mapping, aur Zimyo API call

---

## Step 18: Zimyo Service - Actual HRMS API Call

**File:** `zimyo_api_server/src/services/zimyo.service.js` (line ~1)

```javascript
async makeApiCall(endpoint, payload, authToken) {
    const url = `${ZIMYO_BASE_URL}/${endpoint}`;
    // "https://api.zimyo.com/v1/leave/applyleave"
    
    const formData = new FormData();
    formData.append('leave_type', '1');
    formData.append('reasons', 'health issues');
    formData.append('from_date', '2026-04-10');
    formData.append('to_date', '2026-04-10');
    formData.append('is_half_day', '0');
    
    const response = await axios.post(url, formData, {
        headers: { token: authToken },
        timeout: 30000
    });
    
    return response.data;
}
```

**Ye final API call hai jo Zimyo HRMS system mein leave actually apply karti hai.**

**Kaam:** Zimyo ke real HRMS API ko call karna aur leave submit karna

---

## Step 19: Response Wapas Aata Hai (Bottom → Top)

### 19a. Zimyo API Response
```json
{ "status": "success", "message": "Leave request submitted", "leave_id": "12345" }
```

### 19b. Controller → Handler → MCP Server → MCP Client
Har layer response ko format karke upar pass karti hai.

### 19c. Submit Node Return
**File:** `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/nodes/leave_apply.py` (line ~141)
```python
return {
    "messages": [AIMessage(content="Leave applied! Sick Leave: 2026-04-10 to 2026-04-10 (1 days)")],
    "confirmed": True,
    "next_step": "done",
    "api_result": "Leave applied successfully"
}
```

### 19d. Graph END
```python
g.add_edge("submit_leave", END)  # Graph complete
```

---

## Step 20: Final Response to Frontend

**File:** `zimyo_ai_assistant/hrms_agents/main.py` (line ~76)

```python
def _extract_response(agent_graph, config, agent_name, session_id):
    snap = agent_graph.get_state(config)
    # Last AI message nikalo
    # Status determine karo
    
    return ChatResponse(
        reply="Leave applied! Sick Leave: 2026-04-10 to 2026-04-10 (1 days). Reason: health issues",
        status="done",
        agent="leave_attendance",
        sessionId="session-abc-123"
    )
```

### Frontend Display
**File:** `zimyo_ai_frontend/src/pages/Chat.jsx` (line ~154)

User ko final message dikhta hai: **"Leave applied! Sick Leave: 2026-04-10 to 2026-04-10 (1 days). Reason: health issues"**

---

## Important Files Reference Table

| Kaam | File | Lines |
|------|------|-------|
| Frontend Chat Page | `zimyo_ai_frontend/src/pages/Chat.jsx` | ~118-167 |
| Frontend API Client | `zimyo_ai_frontend/src/api/client.js` | ~25-28 |
| FastAPI Entry Point | `zimyo_ai_assistant/hrms_agents/main.py` | ~94-154 |
| Date Parser | `zimyo_ai_assistant/hrms_agents/tools/date_parser.py` | ~30-47 |
| Agent Classifier/Router | `zimyo_ai_assistant/hrms_agents/supervisor.py` | ~48-95 |
| State Definition | `zimyo_ai_assistant/hrms_agents/state.py` | ~28-40 |
| Graph Definition | `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/graph.py` | ~107-157 |
| Route Node | `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/graph.py` | ~23-49 |
| Collect Node | `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/nodes/leave_apply.py` | ~80-126 |
| Confirm Node | `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/graph.py` | ~57-66 |
| Submit Node | `zimyo_ai_assistant/hrms_agents/agents/leave_attendance/nodes/leave_apply.py` | ~131-150 |
| LLM Extraction | `zimyo_ai_assistant/hrms_agents/tools/llm_extract.py` | ~16-63 |
| HRMS API Wrapper | `zimyo_ai_assistant/hrms_agents/tools/hrms_api.py` | ~24-43 |
| MCP Client | `zimyo_ai_assistant/services/integration/mcp_client.py` | ~60-120 |
| Redis Checkpointer | `zimyo_ai_assistant/hrms_agents/checkpointer.py` | ~1-44 |
| MCP Server | `zimyo_api_server/src/mcp/server.js` | ~1-190 |
| Leave Handler | `zimyo_api_server/src/mcp/handlers/leave.handler.js` | ~84-142 |
| Leave Controller | `zimyo_api_server/src/controllers/leave.controller.js` | ~1-97 |
| Zimyo API Service | `zimyo_api_server/src/services/zimyo.service.js` | ~1-45 |

---

## Key Technologies Used

| Technology | Kahan Use Hota Hai |
|------------|-------------------|
| **React** | Frontend UI - Chat interface |
| **FastAPI (Python)** | Backend API server |
| **LangGraph** | State machine - conversation flow manage karna |
| **Gemini Flash (LLM)** | Intent classification + field extraction |
| **Redis** | State persistence (checkpointer) + Session storage |
| **MCP Protocol** | Python ↔ Node.js communication |
| **Node.js/Express** | HRMS API bridge server |
| **Axios** | HTTP calls to Zimyo HRMS API |
| **Zimyo HRMS API** | Actual leave apply karna |
