# MCP Server Blueprint

Reusable in-process tool-registry pattern for connecting an LLM to your application's APIs. Mirrors the structure used in `backend/app/mcp_server` so any app can adopt the same shape end-to-end.

> **What this gives you.** A typed tool catalog the LLM picks from, a dispatcher that calls the right handler, and an embedding retriever that picks the top-K relevant tools so prompts stay small.

---

## Table of contents

1. [Overview](#1-overview)
2. [Directory layout](#2-directory-layout)
3. [Core classes](#3-core-classes)
4. [Lifecycle](#4-lifecycle)
5. [Adding a new tool — step by step](#5-adding-a-new-tool--step-by-step)
6. [Embedding-based tool retrieval](#6-embedding-based-tool-retrieval)
7. [Prompt assembly (system / user split)](#7-prompt-assembly-system--user-split)
8. [End-to-end request flow](#8-end-to-end-request-flow)
9. [Reusable template — copy into a new app](#9-reusable-template--copy-into-a-new-app)
10. [Testing patterns](#10-testing-patterns)
11. [Glossary](#11-glossary)

---

## 1. Overview

The pattern has four layers:

```
┌──────────────────────────────────────────────────────────────┐
│  LLM (Gemini / Ollama / OpenAI / Anthropic)                  │
│  Picks a tool name + params from the catalog                 │
└───────▲──────────────────────────────────────────────────────┘
        │ JSON workflow spec
┌───────┴──────────────────────────────────────────────────────┐
│  Prompt builder — system + user messages                     │
│  System: framing + rules (cache-friendly)                    │
│  User:   top-K tool docs + examples + question               │
└───────▲──────────────────────────────────────────────────────┘
        │ catalog dicts
┌───────┴──────────────────────────────────────────────────────┐
│  ToolRetriever — embedding cosine + lexical fallback         │
│  Picks top-K relevant tools per query                        │
└───────▲──────────────────────────────────────────────────────┘
        │ ToolDescriptor list
┌───────┴──────────────────────────────────────────────────────┐
│  Dispatcher — registers handlers, executes by name           │
│  Catalog (descriptors) | call(name, params, ctx)             │
└──────────────────────────────────────────────────────────────┘
```

Properties:

* **In-process by default** — no JSON-RPC overhead. The dispatcher keeps an MCP-compatible surface so a real wire-protocol server slots in without engine changes.
* **Lazy embeddings** — computed once on first `top_k()` call; lexical fallback if the embedding API is offline.
* **Stateless tools** — each handler receives `params` + `ctx` and returns a dict. No globals.
* **Token-conscious prompt** — only the top-K tools' descriptions reach the LLM, never the full catalog.

---

## 2. Directory layout

```
app/
├── mcp_server/
│   ├── __init__.py            # exports register_all_tools, ToolDescriptor, ToolParam
│   ├── framework.py           # ToolDescriptor, ToolParam, coerce_params, require
│   ├── client.py              # HTTP wrapper (hrms_get / hrms_post)  ← upstream-specific
│   └── tools/
│       ├── __init__.py        # aggregates every TOOLS tuple → register_all_tools()
│       ├── employees.py       # one descriptor per tool, plus its handler
│       ├── attendance.py
│       ├── leaves.py
│       ├── lookups.py
│       └── dashboards.py
├── workflow/
│   ├── mcp_dispatcher.py      # StubDispatcher, ToolNotFound, ToolDispatchError
│   └── tool_retrieval.py      # ToolRetriever (embeddings + lexical fallback)
├── workflow_prompt.py         # system/user prompt builder
├── llm.py                     # provider factory (gemini/ollama/openai/anthropic)
└── core.py                    # generate_workflow_structured / generate_llm_text
```

Two "halves" — keep them separate when porting:

* **MCP half** (`mcp_server/`) — vendor-neutral framework + your domain tools.
* **Workflow half** (`workflow/`, `workflow_prompt.py`, `core.py`) — LLM wiring, retrieval, dispatch.

---

## 3. Core classes

### 3.1 `ToolParam` (`mcp_server/framework.py`)

A single parameter slot on a tool. Frozen dataclass — descriptors are hashable + immutable.

```python
@dataclass(frozen=True)
class ToolParam:
    name: str
    kind: ParamKind                       # "int" | "string" | "bool" | "object" | "list[int]" | "list[string]"
    required: bool = False
    description: str = ""                 # what the LLM sees
    enum: tuple[str, ...] | None = None   # restrict to literal values
    default: Any = None
    example: Any = None                   # surfaced to the LLM as a concrete sample
```

`to_catalog_dict()` projects the param into the JSON shape the LLM consumes.

**Example.**
```python
ToolParam(
    name="search",
    kind="string",
    required=False,
    description="Fuzzy match on name/code/email. Use 'John' for disambiguation.",
    example="John",
)
```

### 3.2 `ToolDescriptor` (`mcp_server/framework.py`)

The full record for one tool. Pairs the LLM-facing metadata with the executable handler.

```python
@dataclass(frozen=True)
class ToolDescriptor:
    name: str                              # "<category>.<verb>" e.g. "employees.list"
    summary: str                           # one-liner for retrieval embedding
    description: str                       # full detail block sent to LLM (top-K only)
    category: str                          # used for grouping / docs
    upstream: str                          # human-readable upstream route
    returns_shape: str                     # describes the dict the handler returns
    params: tuple[ToolParam, ...] = ()
    examples: tuple[str, ...] = ()         # natural-language usage hints
    handler: ToolHandler | None = None     # (params, ctx) -> dict
```

`to_catalog_dict()` returns the LLM-facing JSON (handler omitted).

**Example.**
```python
_employees_list_descriptor = ToolDescriptor(
    name="employees.list",
    summary="Search / page through the org's employees with optional filters.",
    description=(
        "Primary employee directory. Use for ANY question needing employee rows — "
        "listing, search-by-name, filter-by-status, paged scans for aggregation."
    ),
    category="employees",
    upstream="POST /apiv2/auth/get-all-employees",
    returns_shape=(
        "rows:[{EMPLOYEE_ID:int, EMPLOYEE_NAME, DEPARTMENT_NAME, ...}]; "
        "count, total, pages, page, per_page, search."
    ),
    params=(
        ToolParam("search", "string", required=False, description="Fuzzy match on name/code/email."),
        ToolParam("page", "int", required=False, default=0, description="0-indexed page."),
    ),
    handler=lambda p, ctx: _employees_list_handler(
        coerce_params(_employees_list_descriptor, p), ctx
    ),
)
```

### 3.3 Helpers — `coerce_params`, `require`

`coerce_params(descriptor, params)` drops unknown keys and lightly type-coerces the declared ones. The handler still does strict validation, but the upstream call only sees the surface it expects.

`require(params, *keys)` raises `ValueError("missing required params: ...")` for any key missing or empty.

```python
def _calendar_handler(params, ctx):
    require(params, "employee_id", "start_date", "end_date")
    body = {
        "employee_id": int(params["employee_id"]),
        "START_DATE": params["start_date"],
        "END_DATE": params["end_date"],
    }
    ...
```

### 3.4 `StubDispatcher` (`workflow/mcp_dispatcher.py`)

In-process tool registry. Holds `{name → handler}` and `{name → descriptor_dict}` separately so `catalog()` returns LLM-safe metadata without leaking handlers.

```python
class StubDispatcher:
    def register(self, name: str, handler: ToolHandler, *, descriptor: dict | None = None) -> None: ...
    def has_tool(self, name: str) -> bool: ...
    def list_tools(self) -> list[str]: ...
    def catalog(self) -> list[dict[str, Any]]: ...
    def call(self, name: str, params: Mapping[str, Any], ctx: ToolContext) -> dict[str, Any]: ...
```

`call()` invokes the handler, wraps any unexpected exception in `ToolDispatchError`, and enforces that handlers return a dict.

Two error types:

* `ToolNotFound(KeyError)` — engine asked for an unregistered tool.
* `ToolDispatchError(RuntimeError)` — handler raised; original exception chained.

### 3.5 `ToolHandler` signature

```python
ToolContext = Mapping[str, Any]                       # request-scoped (token, org_id, user_id, ...)
ToolHandler = Callable[[Mapping[str, Any], ToolContext], dict[str, Any]]
```

Convention: handlers must return a `dict`. Common shape — a `rows: list[dict]` field plus scalars (`count`, `total`, paging info). Keep it boring — every transform / render step downstream walks this dict by key.

### 3.6 `ToolRetriever` (`workflow/tool_retrieval.py`)

Caches the catalog + per-tool embeddings; serves `top_k(query, k=8)`.

```python
class ToolRetriever:
    def __init__(self, catalog: list[dict[str, Any]]): ...
    def top_k(self, query: str, k: int = 8) -> list[dict[str, Any]]: ...
```

Construction is cheap — embeddings are computed lazily on the first `top_k` call. If the embedding provider is unavailable, the retriever silently falls back to lexical token overlap.

---

## 4. Lifecycle

### 4.1 Registration (boot)

```python
# app/mcp_server/tools/__init__.py
_MODULES = (lookups, employees, attendance, leaves, dashboards)

def all_tool_descriptors() -> list:
    return [d for module in _MODULES for d in module.TOOLS]

def register_all_tools(dispatcher):
    for descriptor in all_tool_descriptors():
        if descriptor.handler is None:
            raise RuntimeError(f"tool '{descriptor.name}' has no handler")
        dispatcher.register(
            descriptor.name,
            descriptor.handler,
            descriptor=descriptor.to_catalog_dict(),
        )
```

```python
# app/workflow/mcp_dispatcher.py
def build_default_dispatcher() -> StubDispatcher:
    from app.mcp_server import register_all_tools
    dispatcher = StubDispatcher()
    register_all_tools(dispatcher)
    return dispatcher
```

The FastAPI `startup` hook calls `build_default_dispatcher()` once, stashes it on `app.state.mcp_dispatcher`, and routes use it via a `Depends(get_dispatcher)` helper.

### 4.2 Per-request dispatch

```python
ctx = {"token": bearer_token, "org_id": caller_org_id, "user_id": caller_user_id}
result = dispatcher.call("employees.list", {"search": "John"}, ctx)
# result == {"rows": [...], "count": 10, "total": 124, ...}
```

Engine steps:

1. Workflow author LLM emits `{"tool": "employees.list", "params": {...}}`.
2. Engine resolves any `{{ref}}` placeholders against earlier step outputs.
3. Engine calls `dispatcher.call(name, resolved_params, ctx)`.
4. Result is bound to the step's declared `outputs` and merged into scope for downstream refs.

---

## 5. Adding a new tool — step by step

Drop a new descriptor + handler into the right tools file (or create a new one). Five small pieces:

```python
# app/mcp_server/tools/payroll.py
from typing import Any, Mapping

from app.mcp_server.client import HrmsApiError, hrms_post
from app.mcp_server.framework import ToolDescriptor, ToolParam, coerce_params, require

_CATEGORY = "payroll"


# 1. Handler — translates params + ctx into an upstream call.
def _payslip_handler(params: Mapping[str, Any], ctx: Mapping[str, Any]) -> dict[str, Any]:
    token = ctx.get("token")
    if not isinstance(token, str) or not token:
        raise HrmsApiError("missing Zimyo token in tool context")
    require(params, "employee_id", "month")

    body = {"employee_id": int(params["employee_id"]), "month": params["month"]}
    payload = hrms_post("/auth/payroll/payslip", body, token)
    rows = payload.get("data") or []
    return {"rows": rows, "count": len(rows), "month": body["month"]}


# 2. Descriptor — what the LLM sees.
_payslip_descriptor = ToolDescriptor(
    name="payroll.payslip",
    summary="Monthly payslip for one employee.",
    description=(
        "Returns the line items + net pay for a given employee/month. "
        "REQUIRES employee_id (numeric) — disambiguate via employees.list first."
    ),
    category=_CATEGORY,
    upstream="POST /apiv2/auth/payroll/payslip",
    returns_shape="rows:[{component, amount:int, type}]; count; month.",
    params=(
        ToolParam("employee_id", "int", required=True, description="Numeric employee id."),
        ToolParam("month", "string", required=True, description="YYYY-MM."),
    ),
    handler=lambda p, ctx: _payslip_handler(coerce_params(_payslip_descriptor, p), ctx),
)


# 3. Module export — every tools module exposes a TOOLS tuple.
TOOLS: tuple[ToolDescriptor, ...] = (_payslip_descriptor,)
```

```python
# 4. Register the module in tools/__init__.py
from app.mcp_server.tools import (
    attendance, dashboards, employees, leaves, lookups, payroll,
)
_MODULES = (lookups, employees, attendance, leaves, dashboards, payroll)
```

```python
# 5. Done. Restart the app — startup re-builds the dispatcher and the new
#    tool is in the catalog. The retriever picks it up automatically.
```

### Compression rules for tool source text

The retrieval index uses `name + summary + description + param-names` as the embedding doc. Keep `summary` punchy (≤ 100 chars) and `description` dense — they directly drive both retrieval quality AND prompt-token cost. Avoid:

* Marketing prose ("This handy tool lets you …").
* Repeating the upstream route inside `description` (already in `upstream`).
* Listing every field of `returns_shape` with `:str` everywhere — group by type.

---

## 6. Embedding-based tool retrieval

### 6.1 Why retrieve

Sending all 30+ tools to the LLM on every call wastes thousands of tokens. The retriever picks the top-K (typically 5–8) most relevant tools per user question and the prompt only includes those.

### 6.2 What gets embedded

```python
# app/workflow/tool_retrieval.py — _doc_text
def _doc_text(tool):
    parts = [
        tool["name"],
        tool["summary"],
        tool["description"],
    ]
    if tool.get("params"):
        parts.append("params: " + ", ".join(p["name"] for p in tool["params"]))
    return "\n".join(parts).strip()
```

Why include parameter NAMES? Names like `start_date`, `department_id`, `employee_id` carry strong query signal — users ask "calendar for April" → matches `start_date`/`end_date` tokens.

### 6.3 Scoring

```python
def top_k(self, query: str, k: int = 8):
    scored = self._score_embedding(query)
    if scored is None:                       # offline / no API key / network blip
        scored = self._score_lexical(query)
    scored.sort(key=lambda s: (-s[0], s[1])) # high score first; ties → catalog order
    return [self._catalog[idx] for _, idx in scored[:k]]
```

* **Embedding score** — cosine similarity between the query vector and each pre-computed tool vector.
* **Lexical fallback** — token-set overlap (`coverage = |query ∩ doc| / |query|`), with a `+0.5` boost when the overlap hits the tool name itself.

### 6.4 Embedding lifecycle

```python
class ToolRetriever:
    def __init__(self, catalog):
        self._catalog = list(catalog)
        self._doc_texts = [_doc_text(t) for t in self._catalog]
        self._doc_tokens = [_tokens(t) for t in self._doc_texts]
        self._embedder = None              # lazy
        self._doc_embeddings = None        # lazy
```

* Construction does no network IO — boot stays fast.
* First `top_k` call triggers `embed_documents(self._doc_texts)` once and caches the result on the retriever.
* If the embed call raises, `_embedder` is flipped to a sentinel `False` so subsequent calls skip straight to lexical without retrying.

### 6.5 Pseudocode — full pipeline

```text
on user query Q:
  qv = embed_query(Q)                            # one embedding call
  scores = [(cosine(qv, dv), idx) for idx, dv in doc_embeddings]
  top   = sorted(scores, desc)[:K]
  detailed_tools = [catalog[idx] for _, idx in top]

  prompt.user += format_tool_block(detailed_tools)
  prompt.system  = framing + rules               # static, cache-friendly
  llm.invoke([SystemMessage(...), HumanMessage(...)])
```

### 6.6 Tuning notes

| Symptom | Knob |
|---|---|
| Right tool missing from top-K | Bump `k` from 5 → 8, or enrich the tool's `summary` / `description` with words users actually type. |
| Wrong tool ranks first | Add the disambiguating term to that tool's `summary`. Move generic words ("data", "info") out of `summary`. |
| Embedding API down breaks the app | Already handled — lexical fallback. Verify by killing your API key in dev. |
| Catalog grows past ~200 tools | Pre-compute embeddings at boot (replace lazy with eager) and persist the vectors to disk so restarts don't pay the cost. |

### 6.7 Provider-agnostic embedder

The reference uses `langchain_google_genai.GoogleGenerativeAIEmbeddings` but any LangChain embedding works. To swap:

```python
# inside ToolRetriever._ensure_embedder
from langchain_openai import OpenAIEmbeddings
self._embedder = OpenAIEmbeddings(model="text-embedding-3-small")
```

For air-gapped deploys: `langchain_ollama.OllamaEmbeddings` against a local `nomic-embed-text` instance.

---

## 7. Prompt assembly (system / user split)

The LLM is invoked with a chat-style message pair:

* **System** — static framing + rules. Identical across requests so the provider's context cache reuses it.
* **User** — render-mode constraint, top-K detailed tool docs, few-shot examples, retry/fail context, the question.

```python
# app/workflow_prompt.py
def build_system_prompt() -> str:
    return f"{_FRAMING}\n\n{_RULES}"

def build_user_prompt(user_prompt, *, detailed_tools, examples=None,
                     retry_error=None, top_k_examples=3, mode=None) -> str:
    blocks = []
    if mode_hint := _MODE_HINTS.get(mode or ""):
        blocks.append("## Render mode (HARD CONSTRAINT)\n" + mode_hint)
    if detailed_tools:
        blocks.append("## Available tools (top-K, full docs)")
        blocks.extend(_format_tool_detail(t) for t in detailed_tools)
    if examples:
        picked = pick_top_examples(user_prompt, examples, top_k_examples)
        if picked:
            blocks.append("## Examples\n" + _toon_examples(picked))
    if retry_error:
        blocks.append(f"## Previous attempt failed\n{retry_error}\nEmit a corrected WorkflowSpec.")
    blocks.append(f"## Question\n{user_prompt.strip()}")
    return "\n\n".join(blocks)

def build_workflow_messages(user_prompt, **kw) -> tuple[str, str]:
    return build_system_prompt(), build_user_prompt(user_prompt, **kw)
```

LLM call (`app/core.py`):

```python
runnable = bind_json_mode(get_llm(provider, model))
result = runnable.invoke([
    SystemMessage(content=system),
    HumanMessage(content=user),
])
```

### 7.1 Tool-detail format (per top-K tool)

```
### employees.list
Primary employee directory. Use for ANY question needing employee rows…
params:
  search[string,opt]: Fuzzy match on name/code/email.
  page[int,opt] (default=0): 0-indexed page.
returns: rows:[{EMPLOYEE_ID:int, EMPLOYEE_NAME, …}]; count, total, pages, page, per_page, search.
```

Tight, machine-parseable, no markdown overhead beyond `###`.

---

## 8. End-to-end request flow

```text
User: "show John's calendar for April"
  │
  ▼
POST /workflows/run  {prompt, mode}
  │
  ├─ retriever.top_k(prompt, k=5)         → [employees.list, attendance.calendar, ...]
  ├─ retrieve_workflow_examples(db, q, 2) → past highly-rated runs (few-shot)
  ├─ build_workflow_messages(...)         → (system, user)
  │
  ▼
generate_workflow_structured(system, user)
  │
  ├─ llm.invoke([SystemMessage, HumanMessage])  ← JSON-mode bound
  ├─ parse + validate against WorkflowSpec
  │
  ▼
Engine.start(spec, ctx={token, org_id, user_id})
  │
  ├─ for each step:
  │   ├─ resolve {{steps.<id>.output.<key>}} refs against scope
  │   ├─ if action: dispatcher.call(tool, params, ctx) → dict
  │   ├─ if interrupt: persist + 200 with paused state
  │   ├─ if transform: sql / python / json engine
  │   └─ if render: emit final payload (chart | report | text)
  │
  ▼
RunSnapshot {status: "completed", result: {...}}
```

---

## 9. Reusable template — copy into a new app

Below is the minimal skeleton you can paste into any project. Substitute the upstream-specific bits (`hrms_post` → your client) and you have the same structure end-to-end.

### 9.1 `mcp_server/framework.py`
Copy verbatim — it has no app-specific logic.

### 9.2 `mcp_server/client.py`
Replace the HRMS-specific `hrms_get` / `hrms_post` with your service's HTTP wrapper. Keep the surface narrow (1–3 functions) and let it raise a single `ApiError` your tools catch.

### 9.3 `mcp_server/tools/<domain>.py`
For each domain (auth, billing, search, …) one file. Each file exports a `TOOLS: tuple[ToolDescriptor, ...]`.

### 9.4 `mcp_server/tools/__init__.py`
```python
from app.mcp_server.tools import billing, search, users  # add yours

_MODULES = (users, search, billing)

def all_tool_descriptors():
    return [d for m in _MODULES for d in m.TOOLS]

def register_all_tools(dispatcher):
    for d in all_tool_descriptors():
        if d.handler is None:
            raise RuntimeError(f"tool '{d.name}' has no handler")
        dispatcher.register(d.name, d.handler, descriptor=d.to_catalog_dict())
```

### 9.5 `workflow/mcp_dispatcher.py`
Copy verbatim — generic registry.

### 9.6 `workflow/tool_retrieval.py`
Copy verbatim. If you swap embedding providers, change only `_ensure_embedder()`.

### 9.7 `llm.py`
```python
import os
from functools import lru_cache

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
MODEL_NAME   = os.getenv("MODEL_NAME", "gemini-2.5-flash")
TEMPERATURE  = float(os.getenv("LLM_TEMPERATURE", "0.1"))


def _gemini(model):
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(model=model, temperature=TEMPERATURE)

def _ollama(model):
    from langchain_ollama import ChatOllama
    return ChatOllama(model=model, temperature=TEMPERATURE,
                      base_url=os.getenv("LLM_BASE_URL", "http://localhost:11434"))

def _openai(model):
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model=model, temperature=TEMPERATURE)

def _anthropic(model):
    from langchain_anthropic import ChatAnthropic
    return ChatAnthropic(model=model, temperature=TEMPERATURE)


_FACTORIES = {"gemini": _gemini, "ollama": _ollama, "openai": _openai, "anthropic": _anthropic}
_DEFAULTS  = {
    "gemini": "gemini-2.5-flash",
    "ollama": "llama3.1:latest",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-haiku-4-5-20251001",
}


@lru_cache(maxsize=8)
def _build(provider, model):
    return _FACTORIES[provider](model)


def get_llm(provider=None, model=None):
    p = (provider or LLM_PROVIDER).lower()
    m = model or (MODEL_NAME if p == LLM_PROVIDER else _DEFAULTS.get(p, MODEL_NAME))
    return _build(p, m)


def bind_json_mode(llm):
    try:
        from langchain_ollama import ChatOllama
        if isinstance(llm, ChatOllama):
            return llm.bind(format="json")
    except ImportError:
        pass
    return llm.bind(generation_config={"response_mime_type": "application/json"})
```

### 9.8 `workflow_prompt.py`
Copy the system/user split builder. Replace `_RULES` with your domain rules — keep it terse, bulleted, and reference the field names your spec validates against.

### 9.9 `core.py`
```python
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm import bind_json_mode, get_llm

def generate_structured(system, user, *, provider=None, model=None):
    runnable = bind_json_mode(get_llm(provider, model))
    result = runnable.invoke([
        SystemMessage(content=system),
        HumanMessage(content=user),
    ])
    # parse + validate against your spec schema
    return YourSpec.model_validate_json(result.content)
```

---

## 10. Testing patterns

### 10.1 Stub the runnable, not the network

```python
class _FakeRunnable:
    def __init__(self, return_value):
        self._value = return_value
        self.calls = []

    def invoke(self, payload):
        self.calls.append(payload)
        if isinstance(self._value, Exception):
            raise self._value
        return self._value

def _user_text(payload):
    """Pull the user message content from whatever the runnable received."""
    if isinstance(payload, list) and payload:
        last = payload[-1]
        return getattr(last, "content", str(last))
    return str(payload)
```

```python
def test_workflow_author(monkeypatch):
    from app import core
    fake = _FakeRunnable(some_spec_dict)
    monkeypatch.setattr(core, "_workflow_llm_runnable", fake)
    spec = core.generate_workflow_structured("system rules", "show me X")
    assert "show me X" in _user_text(fake.calls[0])
```

### 10.2 Stub the dispatcher

```python
fake = StubDispatcher()
fake.register(
    "users.list",
    lambda p, ctx: {"rows": [{"id": 1, "name": "Alice"}], "count": 1},
    descriptor={"name": "users.list", "summary": "...", "description": "...",
                "category": "users", "upstream": "test", "returns_shape": "...",
                "params": [], "examples": []},
)
app.state.mcp_dispatcher = fake
```

### 10.3 Retriever tests are deterministic

Lexical fallback runs offline — assert that the right tool surfaces for representative queries.

```python
def test_retriever_picks_calendar_tool():
    catalog = build_default_dispatcher().catalog()
    top = ToolRetriever(catalog).top_k("show john's calendar for april", k=3)
    assert "attendance.calendar" in {t["name"] for t in top}
```

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Tool** | One cataloged operation the LLM can pick (`employees.list`). Pairs LLM-facing metadata + an executable handler. |
| **Descriptor** | The metadata side of a tool (`ToolDescriptor`) — what the LLM sees. |
| **Handler** | `(params, ctx) -> dict`. The executable side. |
| **Catalog** | List of descriptor dicts that the LLM and retriever see. Handlers are NOT in the catalog. |
| **Dispatcher** | Registry that maps names to handlers and runs them safely. |
| **ToolContext** | Per-request map (`token`, `org_id`, `user_id`). Engine injects it into every handler call. |
| **Top-K retrieval** | Picking the K most relevant tools per query so the prompt stays small. |
| **System prompt** | Static framing + rules. Cache-friendly across requests. |
| **User prompt** | Per-call dynamic context: tool docs, examples, retry, question. |
| **JSON mode** | Provider-specific binding that forces the LLM to emit JSON (Ollama: `format=json`, Gemini: `response_mime_type=application/json`). |

---

## Appendix A — Token-budget knobs

| Where | Knob | Effect |
|---|---|---|
| `tool_retrieval.py` | `top_k(k=N)` | Fewer detailed-tool blocks in the prompt. |
| `workflow_prompt.py` | `top_k_examples` | Fewer few-shot examples. |
| Tool source text | `description` length | Drops linearly per call (only top-K reach the LLM). |
| Tool source text | `returns_shape` length | Same as above; group fields by type to avoid `:str` repetition. |
| `_RULES` block | Compressed bullets | Charged on every system message; cache-amortised but still counts on first hit. |

## Appendix B — Common pitfalls

1. **Forgetting to register the module** — descriptor exists but isn't in `_MODULES`. Tool is invisible to the LLM. Add it to `tools/__init__.py`.
2. **Returning a non-dict from a handler** — dispatcher raises `ToolDispatchError`. Always wrap your payload in `{"rows": [...], "count": N}`.
3. **Putting `org_id` / `token` in tool params** — they belong in `ctx`, not in params. The LLM should never know about them.
4. **Long descriptions on rarely-used tools** — they bloat retrieval embeddings without paying off. Compress.
5. **No `summary`** — retrieval quality drops. The summary is the highest-signal field per tool.
6. **Catalog mutation after retriever construction** — rebuild the retriever on changes; the embedding cache won't refresh otherwise.
