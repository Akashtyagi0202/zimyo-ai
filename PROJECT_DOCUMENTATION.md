# Zimyo AI — Project Documentation

> Conversational AI assistant for the Zimyo HRMS platform. Lets HR admins and employees do real HRMS work — apply leave, view candidates, initiate CTC, send offer letters, query policies — through a single chat interface (text + voice), in English / Hindi / Hinglish.

---

## 1. Business Requirements We Resolve

### 1.1 The problem
Zimyo HRMS is a feature-rich product, but the UI surface is large. Daily users (employees, HR, admins) hit friction on basic, recurring tasks:

| Pain point | Who feels it | Today's experience |
|---|---|---|
| Apply leave / WFH / regularize a missed punch | Every employee | 4–6 clicks across 2–3 screens, separate forms per type |
| Check leave balance / upcoming holidays | Every employee | Hidden inside the dashboard tree |
| Find a candidate, view stage, move them through onboarding | HR / Recruiters | Multi-tab navigation across Candidate List → Detail → Activity → Offer Letter |
| Initiate CTC + send offer letter | HR / Recruiters | Long form, easy to miss mandatory stages, bucket flags wrong on retries |
| Ask "how does our maternity leave policy work?" | Everyone | Buried in PDFs / handbook |
| Hindi / Hinglish users | Tier-2 cities, BPO/factory clients | English-only UI is a hard blocker |
| Voice / hands-free | Field staff, factory floor, drivers | Doesn't exist |

### 1.2 What this product solves
A **single chat interface** that handles all of the above as natural-language tasks:

1. **Self-service for employees** — apply / cancel leave, WFH, on-duty, regularization, balance check, holiday list, salary slip, policy Q&A.
2. **Onboarding cockpit for HR** — candidate list, candidate details, CTC initiation, offer-letter dispatch, move-to-next-stage, view workflow stages — all conversational, no form-hopping.
3. **Multilingual** — English, Hindi, Hinglish. The LLM matches the user's language; hardcoded strings stay English (so admin tools / logs stay parseable).
4. **Voice-first option** — Deepgram STT + ElevenLabs TTS with a Siri-like dual-payload contract (visual + spoken response, 2-phase ack).
5. **Per-admin configuration** — each Zimyo client tenant can configure CTC defaults, offer-letter templates + CC list, and the active onboarding workflow without code changes.
6. **Policy RAG** — uploaded HR policy PDFs are chunked + embedded; the assistant answers in the HR persona's voice with citations.

### 1.3 Non-goals (kept out on purpose)
- No deploy / CD automation — Akash deploys manually.
- No feature-specific UI cards — only the 13 generic `MessageRenderer` types. Backend sends `{type, data}`, frontend auto-renders.
- No workflow / mutable-admin-config caching across requests — stale cache once caused candidates to skip new mandatory stages.
- No hardcoded keyword tables / phrase lists for routing or HITL gates — those become brittle. LLM-first instead.

---

## 2. High-Level Approach

### 2.1 Three-service split
```
┌──────────────────────┐    ┌────────────────────────┐    ┌──────────────────────┐
│ zimyo_ai_frontend    │    │ zimyo_ai_assistant     │    │ zimyo_api_server     │
│ React + Vite + Tail. │ ←→ │ FastAPI + LangGraph    │ ←→ │ Node.js Express +    │
│ Chat UI / voice      │    │ Agents, planner, RAG,  │    │ MCP server, Zimyo    │
│ Generic renderers    │    │ session, intent router │    │ HRMS HTTP wrapper    │
└──────────────────────┘    └────────────────────────┘    └──────────────────────┘
        :5173                         :8080                         :3001
```

**Why split into three?**
- The **frontend** is dumb-ish: it owns chat UX, voice capture, dark mode, agent picker, and renders 13 generic message types. It never decides intent or holds business logic.
- The **AI assistant (Python)** owns the brain — LLM calls, LangGraph state machines per sub-flow, planner, intent router, session state, RAG, prompt building. This is the only service that talks to LLMs (OpenAI + Gemini).
- The **API server (Node)** is the boundary to Zimyo HRMS. It speaks both HTTP REST (for direct controllers) and **MCP** (Model Context Protocol) so the Python agents can call Zimyo as tools via a typed handler layer. Token / auth handling for Zimyo lives here, not in Python.

### 2.2 LangGraph as the core orchestration
Every distinct user task is a **compiled LangGraph** with its own state schema. The supervisor classifies intent (LLM-first via `intent_router.py`) and dispatches to the right graph. Graphs handle: extraction → preconditions → HITL confirmation → API call → UI response.

Current graphs (12 + meta intents):
- Leave / attendance: `leave_apply`, `on_duty`, `regularization`, `balance_check`, `holiday_check`
- Policy: `policy` (RAG)
- Onboarding: `candidate_list`, `candidate_details`, `ctc_initiate`, `send_offer_letter`, `move_candidate`, `workflow_stages`
- Meta: `workflow_info` (answered inline from session state, no graph)

### 2.3 LLM-first everywhere routing happens
- **Intent routing** — `services/ai/intent_router.py` makes one LLM call per fresh-text turn. `AGENT_CAPABILITIES` (in `supervisor.py`) is the single source of truth — descriptions are *purpose-based*, not phrase lists. Legacy regex router is gated behind `USE_LEGACY_ROUTER=1`.
- **HITL gates** — the human-in-the-loop confirmation step uses an LLM classifier + edit-applier, not hardcoded keyword tables.
- **Field extraction** — `tools/llm_extract.py` pulls structured JSON from messy user input (dates, names, amounts) instead of regex.
- **Modify intent during voice** — voice "modify" parser is also an LLM call.

Plain `get_chat_response` is reserved for HR persona answers (RAG). Everything structured uses `get_chat_response_raw`.

### 2.4 MCP bridge (Node) for Zimyo HRMS
The Python side never talks to Zimyo HTTP directly. Instead, `tools/api/_mcp.py` calls the Node MCP server which has typed handlers per resource (`leave.handler.js`, `candidate.handler.js`, etc.). This:
- Centralizes Zimyo auth / token refresh in one process.
- Lets us mock Zimyo per handler for tests.
- Keeps Python tools small and uniform.

### 2.5 Generic UI renderers
Backend never sends "candidate card" or "leave form". It sends one of 13 generic types and the frontend's `MessageRenderer.jsx` switches:
```
text_bubble, card, data_table, form, wizard, checklist,
chips, dashboard, stats_cards, bar_chart, line_chart, pie_chart,
approval, confirmation, success_banner, error_card, pdf_preview,
loading, empty, editor, split, chat_handoff
```
This rule is non-negotiable — feature-specific cards are forbidden.

### 2.6 Per-admin configuration in MongoDB
Three collections backed by `services/operations/`:
- `ctc_defaults` — per-admin CTC compute toggles, applicable-from strategy, OT/Bonus plans.
- `offer_letter_defaults` — per-admin template + CC list.
- Active workflow — per-admin chosen onboarding workflowV2 ID.

Surfaced via `/config/ctc`, `/config/offer-letter`, `/config/workflow*` endpoints, configured from the React `Settings` page and the chat-header chip.

### 2.7 Catalog-aware planner (Slice 1 landed)
`services/ai/api_catalog/` is a declarative registry of Zimyo APIs + their fields + preconditions. The planner (`services/ai/planner/`) uses this to decide:
- Which API the user's intent maps to (`subject_loader.py`).
- What fields are missing (`resolvers.py`).
- Which steps to skip (`skip_rules.py`).
- Sequenced execution (`runner.py`).

Onboarding APIs (14) are registered. Leave / attendance / holiday catalogs exist but planner integration is staged.

### 2.8 Voice contract (Siri-like)
- **Dual payload**: every assistant turn returns visual JSON for the chat UI *and* a short spoken string for TTS.
- **2-phase ack**: an immediate acknowledgement plays while the heavy LLM call runs, so the user never waits on silence.
- **Input-mode aware**: the prompt knows whether the user spoke or typed, and adjusts response length / formality.
- Stack: Deepgram STT → Python LangGraph → ElevenLabs TTS.

---

## 3. Folder Structure

### 3.1 Top-level
```
zimyo ai/
├── start.sh                          # Boot all 3 services + venv activation
├── README.md
├── LEAVE_APPLY_FLOW.md               # Design doc for leave flow
├── zimyo_ai_frontend/                # React (Vite + Tailwind)
├── zimyo_ai_assistant/               # FastAPI + LangGraph (Python brain)
└── zimyo_api_server/                 # Node.js MCP bridge to Zimyo
```

### 3.2 `zimyo_ai_assistant/` — Python brain
```
zimyo_ai_assistant/
├── config.py                         # Env, model IDs, feature flags
├── docker-compose.yml                # Local Redis (LangGraph checkpointer)
├── mcp_config.json                   # Points Python at Node MCP server
├── pytest.ini
├── requirements.txt
│
├── hrms_agents/                      # The agent / graph layer
│   ├── main.py                       # FastAPI app factory; mounts routers only
│   ├── supervisor.py                 # AGENT_CAPABILITIES + ROUTING_REGISTRY
│   ├── checkpointer.py               # Redis-backed LangGraph state persistence
│   │
│   ├── api/                          # HTTP routes (thin)
│   │   ├── chat.py                   # /chat — main entry; routes interrupted resumes
│   │   ├── sessions.py               # session create / list / clear
│   │   ├── auth.py                   # Zimyo login → token mint
│   │   ├── policy.py                 # /policy upload + query
│   │   ├── health.py
│   │   ├── config/                   # /config/ctc, /config/offer-letter, /config/workflow
│   │   └── _shared/errors.py         # DomainError → HTTP mapper
│   │
│   ├── agents/                       # One subfolder per domain
│   │   ├── leave_attendance/
│   │   │   ├── graphs/               # leave_graph, duty_graph, fetch_graph
│   │   │   ├── nodes/                # extraction, preconditions, hitl, exec
│   │   │   ├── prompts/              # domain LLM prompts
│   │   │   └── ui/                   # response builders → generic renderer types
│   │   ├── onboarding/
│   │   │   ├── graphs/               # 6 graphs: candidate_list, candidate_details,
│   │   │   │                         #   ctc_initiate, send_offer_letter,
│   │   │   │                         #   move_candidate, workflow_stages
│   │   │   ├── nodes/                # _ctc_helpers, _helpers, per-flow nodes
│   │   │   ├── prompts/
│   │   │   └── ui/
│   │   └── policy/
│   │       ├── graph.py              # RAG graph
│   │       └── rag_tools.py
│   │
│   ├── states/                       # TypedDict / pydantic state per graph
│   │   ├── base.py, leave.py, duty.py, fetch.py, onboarding.py, policy.py
│   │
│   ├── tools/                        # Reusable agent tools
│   │   ├── api/                      # MCP-backed Zimyo callers (leave, attendance,
│   │   │                             #   holidays, onboarding) + _mcp.py bridge
│   │   ├── ui/                       # confirm_card etc.
│   │   ├── llm_extract.py            # structured-JSON extraction helper
│   │   ├── hitl_confirm.py           # LLM-first HITL classifier
│   │   └── date_parser.py
│   │
│   └── utils/
│
├── services/                         # Cross-cutting application services
│   ├── ai/
│   │   ├── chat.py                   # get_chat_response / get_chat_response_raw
│   │   ├── intent_router.py          # LLM-first router (one call per turn)
│   │   ├── rag.py                    # PDF chunk → embed → search
│   │   ├── prompts/                  # Shared system prompts
│   │   ├── api_catalog/              # Declarative API registry (Slice 1: onboarding)
│   │   │   ├── _base.py, _registry.py, _preconditions.py, _prompt_builder.py
│   │   │   ├── attendance.py, holiday.py, leave.py, onboarding.py
│   │   └── planner/                  # Catalog-driven planner
│   │       ├── runner.py, resolvers.py, skip_rules.py, subject_loader.py
│   │
│   ├── core/                         # Domain services (HTTP-agnostic)
│   │   ├── employee.py, policy.py
│   │   ├── auth.py, login_handler.py, session_handler.py
│   │   ├── active_candidate.py
│   │   ├── admin_prefs.py
│   │   ├── ctc_defaults.py
│   │   └── offer_letter_defaults.py
│   │
│   └── operations/                   # MongoDB persistence layer
│       ├── conversation_state.py
│       ├── ctc_defaults.py
│       └── offer_letter_defaults.py
│
├── integrations/
│   └── mcp_client.py                 # stdio-spawn MCP client → Node server
│
├── scripts/                          # check_layers, install_hooks, test_router
├── tests/
└── docs/                             # Design notes
```

### 3.3 `zimyo_api_server/` — Node MCP bridge
```
zimyo_api_server/
├── package.json                      # express, axios, MCP SDK, redis
└── src/
    ├── index.js                      # HTTP server (port 3001)
    ├── config/
    ├── routes/                       # attendance, leave, health, mcp
    ├── controllers/                  # one per resource
    │   ├── attendance.controller.js
    │   ├── candidate.controller.js
    │   ├── holiday.controller.js
    │   ├── leave.controller.js
    │   ├── onduty.controller.js
    │   ├── regularization.controller.js
    │   └── salaryslip.controller.js
    ├── services/
    │   └── zimyo.service.js          # Zimyo HTTP client + token refresh
    └── mcp/                          # MCP server (Python tools call this)
        ├── server.js                 # MCP entry
        ├── ARCHITECTURE.md
        ├── HANDLER_TEMPLATE.js       # Copy this to add a new handler
        ├── test-mcp.js
        └── handlers/
            ├── base.handler.js       # Shared validation + error mapping
            ├── attendance.handler.js
            ├── candidate.handler.js
            ├── holiday.handler.js
            ├── leave.handler.js
            ├── onduty.handler.js
            ├── regularization.handler.js
            └── salaryslip.handler.js
```

### 3.4 `zimyo_ai_frontend/` — React UI
```
zimyo_ai_frontend/
├── package.json                      # react 18, vite, tailwind, recharts,
│                                     #   @deepgram/sdk, tiptap, react-markdown
├── vite.config.js
├── tailwind.config.js
└── src/
    ├── main.jsx, App.jsx, index.css
    ├── api/
    │   └── client.js                 # fetch wrapper for Python /chat /sessions
    ├── pages/
    │   ├── Login.jsx                 # Zimyo creds → token
    │   ├── AgentSelect.jsx           # pick HRMS / Onboarding agent
    │   ├── Chat.jsx                  # Main chat shell
    │   └── Settings.jsx              # CTC / offer-letter / workflow config UI
    ├── hooks/
    │   ├── useDarkMode.jsx
    │   └── useDeepgramSTT.jsx        # Voice STT
    └── components/
        ├── ChatInput.jsx, ChatMessage.jsx
        ├── MessageRenderer.jsx       # Type-switch: dispatches to messages/*
        ├── Sidebar.jsx, QuickActions.jsx, ActionButtons.jsx, Toast.jsx
        └── messages/                 # 22 generic renderers — never feature-specific
            ├── TextBubble.jsx, Card.jsx, DataTable.jsx, Form.jsx, Wizard.jsx
            ├── Checklist.jsx, Chips.jsx, Dashboard.jsx, StatsCards.jsx
            ├── BarChart.jsx, LineChart.jsx, PieChart.jsx
            ├── Approval.jsx, Confirmation.jsx, SuccessBanner.jsx, ErrorCard.jsx
            ├── PdfPreview.jsx, Loading.jsx, Empty.jsx
            ├── Editor.jsx, Split.jsx, ChatHandoff.jsx
            └── _RichTextEditor.jsx
```

---

## 4. Request Lifecycle (Worked Example)

User types: **"sick leave chahiye kal"** in chat.

1. **Frontend** (`Chat.jsx` → `api/client.js`) POSTs to `POST /chat` on Python (`:8080`).
2. **`api/chat.py`** loads session state from Redis (LangGraph checkpointer). Checks `_is_interrupted` — not interrupted, so this is a fresh-text turn.
3. **`supervisor.py`** calls `services/ai/intent_router.py`. One LLM call against `AGENT_CAPABILITIES` returns `{intent: "leave_apply", confidence: 0.93, reason: "..."}`.
4. **`ROUTING_REGISTRY["leave_apply"]`** → `leave_graph` (compiled LangGraph in `agents/leave_attendance/graphs/`).
5. Graph nodes execute:
   - `extract_node` → `tools/llm_extract.py` pulls `{type: "sick", date: "2026-04-28"}`.
   - `precondition_node` → checks balance via `tools/api/leave.py`.
   - `hitl_confirm_node` → returns a generic `confirmation` renderer payload.
6. Graph **interrupts**, state checkpointed to Redis. Frontend renders the confirmation card.
7. User clicks "Confirm" → `POST /chat` with chip-click payload. `api/chat.py` sees interrupted state, resumes the graph (no router pass).
8. `execute_node` calls `tools/api/leave.py` → MCP client → Node `leave.handler.js` → Zimyo HRMS HTTP API → response back up.
9. Final node emits a `success_banner` payload. Frontend's `MessageRenderer.jsx` renders it.

For voice, the same flow runs but `chat.py` returns a dual payload `{visual, spoken}` and an immediate ack plays while step 5–6 run.

---

## 5. Tech Stack Summary

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, Tailwind 3, react-router 6, Recharts, Tiptap, react-markdown, Deepgram SDK |
| AI brain | Python 3.11+, FastAPI, Uvicorn, LangGraph (Redis checkpointer), Pydantic, OpenAI SDK, Google Generative AI SDK, sentence-transformers, FAISS, PyMuPDF / pdfplumber, edge-tts |
| API bridge | Node.js, Express, axios, MCP SDK (`@modelcontextprotocol/sdk`), Redis |
| Persistence | Redis (sessions / checkpointer), MongoDB (admin configs, conversation state) |
| External | Zimyo HRMS REST APIs, Deepgram STT, ElevenLabs TTS |

---

## 6. How to Run

```bash
./start.sh                            # Boots Redis + Python + Node + Vite
```
Per-service:
- Python: `cd zimyo_ai_assistant && source venv/bin/activate && uvicorn hrms_agents.main:app --reload --port 8080`
- Node:   `cd zimyo_api_server && npm run mcp`  *(also `npm run dev` for HTTP)*
- Front:  `cd zimyo_ai_frontend && npm run dev`

Default URLs: frontend `:5173`, Python `:8080`, Node `:3001`. Demo creds in project memory.

---

## 7. Design Principles (Internal Rules)

1. **Generic UI only** — never create a feature-specific renderer. Use the 13 types.
2. **LLM-first** — routing, HITL, extraction, language detection. No keyword tables disguised as "trigger phrases."
3. **No mutable-config caching across requests** — workflow stages and admin config are read fresh.
4. **English defaults for hardcoded strings**; Hinglish/Hindi only emerges from LLM prompts that follow the language-match rule.
5. **Verify against real Zimyo endpoints with curl** before normalizing field names.
6. **One slice at a time** for onboarding work — land, verify, then extend.
7. **No deploy automation** — manual deploys.
8. **`get_chat_response_raw` for structured calls; plain `get_chat_response` only for RAG persona answers.**
