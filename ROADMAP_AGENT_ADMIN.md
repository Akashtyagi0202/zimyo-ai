# Agent Admin Portal — Phase-wise Roadmap

> Single source of truth for porting the agent admin UI (Mission Control / Interrupt Inbox / Activity / Assistant) on top of the **existing LangGraph supervisor stack**. No parallel agent runtime. No mock data.

**Scope:** `/admin/*` routes in `zimyo_ai_frontend` calling `zimyo_ai_assistant` (FastAPI + LangGraph) directly on port 8080. The Node `zimyo_api_server` is **NOT** part of this flow — admin portal talks to Python only. Memory uses Redis checkpointer + a new long-term store. Activity log is a new first-class subsystem.

**Driving principles (locked):**
1. Reuse `hrms_agents/supervisor.py`, `intent_router`, existing graphs under `hrms_agents/agents/onboarding/graphs/`. No parallel agent stack.
2. No mock data. If a section has no real source yet, defer the section rather than ship placeholders.
3. Every phase is independently shippable and testable. CI green before next phase begins.
4. Backend is the only source of truth. Frontend re-fetches; never caches authoritative state.
5. Naming consistency across UI/API/code: pick one term and use it everywhere.

---

## Naming decisions (locked before phase 1)

| Concept | Canonical name | Used in |
|---|---|---|
| Page where admin approves pending plans | **Needs Approval** | left nav, page title, URL `/admin/agents/approvals`, toast |
| Mission Control sub-section | **Needs your approval** | section header inside Mission Control |
| LangGraph term in code only | `interrupt` | internal code, logs, never user-facing |
| Workflow state (code/API enum) | `running` / `waiting_on_candidate` / `awaiting_approval` / `completed` / `cancelled` | DB column, API responses, code only |
| Workflow state (display label) | **In progress** / **Waiting on candidate** / **Needs your attention** / **Done** / **Withdrawn** | every UI badge, filter chip, list cell |
| Status badge | shared `<StatusBadge state={...}/>` component — never inline copies | all admin pages |
| The "approve" CTA | **Approve & Run** | everywhere (not "Confirm", not "Submit") |
| The "reject" CTA | **Reject** | everywhere (not "Cancel" — cancel is for in-flight workflows) |

---

## Architecture snapshot

```
┌─────────────────────────────┐
│  zimyo_ai_frontend (React)  │  /admin/* routes
│  - VITE_API_URL=:8080       │
└──────────────┬──────────────┘
               │ REST + SSE (direct)
               ▼
┌─────────────────────────────┐
│  zimyo_ai_assistant (Py)    │  FastAPI + LangGraph supervisor — :8080
│  - supervisor.py            │
│  - agents/onboarding/*      │
│  - checkpointer (Redis)     │
│  - NEW: store (Redis/PG)    │
│  - NEW: activity emitter    │
│  - NEW: webhooks + SSE      │
└──────────────┬──────────────┘
               │
               ▼
        Redis / RedisStack (LangGraph checkpointer + RediSearch)
        MongoDB (activity_log + agent_memory)

# zimyo_api_server (Node, :3000) is unrelated — it handles HRMS proxy for
# the candidate/employee chat flows. Not in the admin portal path.
```

**Thread-id convention (existing):** `"{user_id}:{session_id}:{sub_flow}"`. For per-candidate onboarding journeys we extend to `"onboarding:{org_id}:{candidate_id}"` so one candidate = one stable thread regardless of admin session.

---

## Phase 0 — Foundation & cleanup (2 days)

**Goal:** clean baseline before any feature work. Naming aligned, dead code culled, lint/CI green.

### Tasks
- [ ] **Rename inconsistencies** (per table above) across `zimyo_ai_frontend/src/components/Sidebar.jsx`, `WorkflowList.jsx`, `WorkflowDetail.jsx`, all admin pages.
- [ ] Replace "Interrupt Inbox" page title with "Needs Approval". Update route to `/admin/agents/approvals` (keep redirect from old `/inbox` for 1 release).
- [ ] Replace "Cancel" with "Reject" on plan-approval cards; reserve "Cancel" for running workflows only.
- [ ] Decide Mission Control vs Approvals overlap → **Decision: Mission Control shows all 4 sections (Needs your approval / Running now / Waiting on candidate / Recently completed). Standalone `/approvals` page is a filtered view of section #1 — same data, different chrome. Single shared API endpoint.**
- [ ] **Completed agents must NOT disappear.** Every workflow that reaches `completed` or `cancelled` stays visible in the "Recently completed" section for 7 days by default (configurable per org), then collapses behind a "View all completed →" link to a full history page. Bulk supervisor agents, child agents, single-step agents — all show up here after END. Reason: audit continuity + admin's mental model of "what just happened". Live Agents counter (left nav) still counts only non-terminal — that's separate from visibility.
- [ ] Add a typed `WorkflowState` enum (Python + JS shared via OpenAPI spec or hand-mirrored constants).
- [ ] **Concurrency invariant: one active workflow per (org_id, candidate_id, workflow_type).** Workflow-start endpoint checks for an existing non-terminal thread; if present, returns `409 Conflict` with `{existing_workflow_id, state}` so the UI can route admin to the live card instead of spawning a duplicate. Different candidates / different workflow_types → fully parallel, no check.
- [ ] **Scaffold `/admin/*` route tree.** Current `App.jsx` only has `/login` / `/agents` / `/chat/:agentType` / `/settings` — no admin routes exist. Add `<Route path="/admin/*">` with a shared admin shell (left nav + top bar). Sub-routes registered (placeholder pages OK in this phase): `/admin/dashboard`, `/admin/assistant`, `/admin/candidates`, `/admin/employees`, `/admin/agents` (Mission Control), `/admin/agents/approvals`, `/admin/workflows`, `/admin/activity`, `/admin/settings`. Each placeholder renders a "Coming in phase X" stub citing the relevant phase.
- [ ] Build the shared `<StatusBadge state={...}/>` component that maps the 5 enum values → display label + colour. Use it everywhere a workflow state badge appears.

### Files touched
- `zimyo_ai_frontend/src/components/Sidebar.jsx`
- `zimyo_ai_frontend/src/pages/admin/*.jsx` (rename + copy)
- `zimyo_ai_frontend/src/api/client.js`
- `zimyo_ai_assistant/hrms_agents/api/onboarding/__init__.py` (if it routes existing)

### Testing
- Manual: walk the left nav top→bottom, ensure no "Interrupt"/"Inbox"/"Needs your okay" copy remains.
- Automated: add a frontend Jest test that snapshots Sidebar labels.
- Lint + typecheck: `cd zimyo_ai_frontend && npm run lint && npm run typecheck`.

### Done when
- One canonical name per concept used in code, API responses, and UI copy.
- Old `/inbox` redirects to `/approvals` with 301.
- CI green.

---

## Phase 1 — Activity log infrastructure (3 days)

**Goal:** every admin/agent/candidate/system action lands in one append-only stream, queryable by actor + event type + candidate. This is foundational; later phases emit into it.

### Schema (MongoDB time-series collection)

Mongo + Redis stack already exists (`infra/mongo.py`, `infra/redis.py`); no new infra. Use a **time-series collection** for `activity_log` — append-only, optimized for time-range queries, native TTL support.

```js
// One-time creation:
db.createCollection("activity_log", {
  timeseries: {
    timeField: "occurred_at",
    metaField: "meta",           // indexed automatically — put org_id, actor_type, event_type, candidate_id here
    granularity: "seconds"
  },
  expireAfterSeconds: 60 * 60 * 24 * 365 * 2  // 2-year retention; tune per org/compliance
})

// Document shape per emit():
{
  _id: ObjectId,
  occurred_at: ISODate,
  meta: {
    org_id:       "org_xyz",
    actor_type:   "admin" | "agent" | "candidate" | "system",
    actor_id:     "u_akash" | "agent_nrr3g5qj" | "c_neil_001" | null,
    event_type:   "plan_drafted" | "plan_approved" | "plan_rejected"
                  | "step_started" | "step_completed" | "step_failed"
                  | "tool_called" | "interrupt_raised" | "resumed"
                  | "form_sent" | "form_submitted" | "offer_accepted"
                  | "offer_rejected" | "workflow_completed" | "workflow_cancelled"
                  | "bucket_entered" | "bucket_exited" | "memory_edited"
                  | "reminder_sent" | "note",
    candidate_id: "c_neil_001" | null,
    workflow_id:  "wf_a8f3" | null,            // thread_id for agent events
    bulk_id:      "bulk_42" | null
  },
  actor_label: "Akash Tyagi",                   // denormalized display name (survives rename)
  payload:     { ... },                         // event-specific (free-form)
  message:     "Approved plan for Neil Verma"   // pre-rendered one-liner for the UI
}

// Secondary indexes (meta.* fields are auto-indexed by time-series collection;
// these are explicit composite indexes for the common filtered queries):
db.activity_log.createIndex({ "meta.org_id": 1, "meta.candidate_id": 1, "occurred_at": -1 })
db.activity_log.createIndex({ "meta.org_id": 1, "meta.workflow_id": 1, "occurred_at": -1 })
db.activity_log.createIndex({ "meta.org_id": 1, "meta.event_type": 1, "occurred_at": -1 })
db.activity_log.createIndex({ "meta.org_id": 1, "meta.bulk_id": 1, "occurred_at": -1 })
```

**Why time-series collection:** internal bucketing dramatically reduces index size for append-heavy audit data; TTL is native; range queries on `occurred_at` are the optimized path. We never UPDATE rows — pure insert.

### Backend tasks
- [ ] New module: `zimyo_ai_assistant/services/core/activity.py` — single function `emit(org_id, actor, event_type, candidate_id=None, workflow_id=None, payload=None, message=None)`.
- [ ] Idempotency: caller can pass `dedupe_key` (e.g. `f"{workflow_id}:{step_id}:completed"`) to prevent double-writes on graph replay.
- [ ] Async writer: emit() pushes to an in-process `asyncio.Queue`; a background task flushes to Mongo via `insert_many` in batches (every 500ms or 50 events). Failures retry 3× then log loudly — never block agent execution.
- [ ] New API endpoints in `hrms_agents/api/activity.py`:
  - `GET /activity?org_id&actor_type=&event_type=&candidate_id=&since=&until=&cursor=` — paginated reverse-chronological.
  - `GET /activity/candidate/{candidate_id}` — per-candidate timeline shortcut.

### Where to emit (Phase 1 minimum set)
| Trigger | event_type | Where in code |
|---|---|---|
| Admin sends a chat message that spawns a workflow | `workflow_started` | `hrms_agents/api/chat.py` after supervisor route |
| Supervisor produces a plan | `plan_drafted` | `supervisor.py` end of intent dispatch |
| Admin clicks Approve & Run | `plan_approved` | resume endpoint |
| Admin clicks Reject | `plan_rejected` | resume endpoint |
| Any graph node enters | `step_started` | node decorator (see below) |
| Any graph node exits cleanly | `step_completed` | node decorator |
| Any graph node raises | `step_failed` | node decorator |
| LangGraph `interrupt()` | `interrupt_raised` | wrap `interrupt` callsites |
| LangGraph resume | `resumed` | resume endpoint |
| Workflow reaches END | `workflow_completed` | terminal node |

Implement a `@logged_node` Python decorator in `services/core/activity.py` that wraps node functions and emits start/complete/fail automatically — keeps per-node code clean.

### Frontend tasks
- [ ] Rebuild `/admin/activity` page against real `GET /activity` API (replace current static rendering).
- [ ] Filter chips: All actors / Admin / Agent / Candidate / System; All events / + 12 specific types.
- [ ] Infinite scroll via cursor.
- [ ] Empty state copy: "Nothing logged yet for this filter — try broadening it."
- [ ] Each row clickable → opens drawer with full `payload` JSON pretty-printed (devs love this; HR ignores it).

### Files touched
- NEW: `zimyo_ai_assistant/services/core/activity.py`
- NEW: `zimyo_ai_assistant/hrms_agents/api/activity.py`
- NEW: `zimyo_ai_assistant/infra/migrations/mongo/0001_activity_log.py` — idempotent script that calls `createCollection` + `createIndex`; safe to re-run on boot.
- `zimyo_ai_assistant/hrms_agents/api/chat.py` (emit on workflow_started)
- `zimyo_ai_assistant/hrms_agents/supervisor.py` (emit plan_drafted)
- Each `agents/*/nodes/*.py` — add `@logged_node` decorator (mechanical change)
- NEW: `zimyo_ai_frontend/src/pages/admin/Activity.jsx`
- `zimyo_ai_frontend/src/api/client.js` — add `listActivity()`

### Testing
**Unit:**
- `tests/services/test_activity.py` — emit(), dedupe_key, batch flush, retry on PG transient failure.
- `tests/services/test_logged_node.py` — decorator emits start/complete/fail correctly, including on exception re-raise.

**Integration:**
- Spin up real Mongo in CI (`mongo:7` service in `docker-compose.yml`), trigger a known workflow end-to-end, assert exactly N documents in `activity_log` with expected `meta.event_type` sequence.

**Manual smoke:**
- Trigger "let onboard Neil Verma" → verify rows: `workflow_started`, `plan_drafted`, then after approval `plan_approved`, `step_started`, `step_completed`, etc.
- Filter by actor=Admin, event=plan_approved — count matches manual approvals.

### Done when
- Every action surface in current product writes one row to `activity_log`.
- `/admin/activity` shows real data, filters work, pagination works.
- Decorator coverage ≥ 95% of node functions (track with a CI grep).
- Activity emit never blocks request path more than 1ms (measured).

---

## Phase 2 — Long-term memory store (4 days)

**Goal:** persistent admin prefs + org rules + episodic memory beyond per-thread checkpoint. Pre-fill plan forms from this on every fresh plan.

### Storage
**MongoDB collection** — same instance as activity_log. Reuses `infra/mongo.py` client.

```js
// Document shape:
{
  _id:        ObjectId,
  org_id:     "org_xyz",
  namespace:  "admin_prefs" | "org_rules" | "candidate_facts" | "episodes",
  key:        "u_akash" | "global" | "c_neil_001" | "{episode_uuid}",
  value:      { ... },                  // free-form per namespace (validated by Pydantic in MemoryStore wrapper)
  updated_at: ISODate
}

// Unique compound key + lookup indexes:
db.agent_memory.createIndex({ org_id: 1, namespace: 1, key: 1 }, { unique: true })
db.agent_memory.createIndex({ org_id: 1, namespace: 1, updated_at: -1 })

// For episodic search (Phase 2.1, if needed):
db.agent_memory.createIndex({ org_id: 1, namespace: 1, "value.role": 1, updated_at: -1 })
```

Wrap with a thin `MemoryStore` class — `get / put / merge / search`. Pydantic models per namespace enforce value shape at the boundary. Reserve right to swap backend to LangGraph Store later without touching call sites.

### What gets stored

| Namespace | Key | Value example | Updated when |
|---|---|---|---|
| `admin_prefs` | `{admin_uid}` | `{bgv_vendor:"Signzy", joining_buffer_days:14, default_template:"std-eng", probation_months:6}` | After each approval — merge admin's chosen values |
| `org_rules` | `"global"` | `{mandatory_steps:[...], salary_bands:{...}, allowed_vendors:[...]}` | Admin-edited from Settings page (Phase 7) |
| `candidate_facts` | `{candidate_id}` | `{is_rehire:false, source:"referral", referrer_uid:"u123", notes:[...]}` | When admin adds a note OR rehire detected |
| `episodes` | `{episode_uuid}` | `{candidate_id, role, dept, duration_days, steps, inputs, outcome:"completed"\|"rejected"}` | Workflow terminal node |

### Backend tasks
- [ ] NEW `services/core/memory_store.py` — typed wrapper (use Pydantic models per namespace).
- [ ] Migration: `infra/migrations/mongo/0002_agent_memory.py` — idempotent `createIndex` calls.
- [ ] Hooks:
  - Plan-draft node calls `store.get(admin_prefs)` + `store.search(episodes, filter={role: candidate.role}, limit=5)` and injects defaults into the interrupt payload.
  - Resume endpoint, after collecting form values, calls `store.merge(admin_prefs, akash_uid, {bgv_vendor: chosen, ...})` async.
  - Terminal node writes `episodes` entry with redacted, non-PII summary.
- [ ] Admin can view + edit prefs at `/admin/settings/agent-defaults` (Phase 7).

### Frontend tasks
- Mostly invisible in Phase 2. Plan-approval form fields gain a small `Suggested from your past picks` hint chip below pre-filled inputs.

### Files touched
- NEW: `zimyo_ai_assistant/services/core/memory_store.py`
- NEW: `zimyo_ai_assistant/infra/migrations/mongo/0002_agent_memory.py`
- Plan-draft logic in relevant supervisor / planner nodes (likely `agents/onboarding/nodes/_helpers.py` and per-graph planners)
- `zimyo_ai_frontend/src/components/WorkflowDetail.jsx` — render hint chips

### Testing
**Unit:**
- `test_memory_store.py` — get/put/merge round-trip, namespace isolation across orgs.

**Integration:**
- Run "let onboard candidate A" twice with same admin; second run should pre-fill BGV vendor from first.
- Org isolation: org X's admin should never see org Y's prefs (multi-tenant safety test).

**Manual:**
- Onboard 3 candidates, change defaults each time → verify `admin_prefs` reflects the latest pick.
- Onboard a 4th candidate in same role → verify episodic suggestions appear ("median CTC for Senior QA: 22L").

### Done when
- Pre-fill latency on plan draft ≤ 200ms p95.
- Admin onboarding their 2nd candidate sees zero "Required" red errors on the form.
- Org isolation test passes.

---

## Phase 3 — Candidate-dependent step interrupts (4 days)

**Goal:** when agent sends a joining form / offer letter / appointment letter / BGV trigger, it `interrupt()`s with `type=awaiting_candidate` and the UI surfaces a "Waiting on candidate" card. Candidate's webhook resumes the graph hours/days/weeks later.

### Backend tasks
- [ ] Extend interrupt payload shape:
  ```python
  {
    "type": "awaiting_candidate",
    "event": "joining_form_submitted" | "offer_decision" | "appointment_decision" | "bgv_report_ready",
    "sent_at": iso8601,
    "sent_via": "email" | "sms" | "whatsapp",
    "reminder_after_hours": 24,  # for the dunning job
    "manual_actions": ["resend", "cancel", "mark_received"]
  }
  ```
- [ ] Webhook endpoints (new):
  - `POST /webhooks/candidate/joining-form` — body: `{candidate_id, form_data, signed_at}`. Resolves active thread → `graph.invoke(Command(resume=form_data), config={thread_id})`.
  - `POST /webhooks/candidate/offer-decision` — body: `{candidate_id, decision:"accepted"|"rejected", reason?}`.
  - `POST /webhooks/candidate/appointment-decision` — same shape.
  - `POST /webhooks/vendor/bgv-report` — body: `{candidate_id, vendor:"Signzy", verdict:"clear"|"discrepancy", report_url}`.
- [ ] Webhook auth: HMAC signature per candidate-portal / per vendor — fail closed.
- [ ] Idempotency: each webhook carries `event_id`; replays no-op.
- [ ] Dunning job (cron, 1/hr): for any waiting interrupt past `sent_at + reminder_after_hours`, re-send the trigger email and emit `reminder_sent` activity event. Max 3 reminders, then escalate (Phase 6).

### Frontend tasks
- [ ] **Mission Control "Waiting on candidate" section** — already mocked in screenshots. Wire to real API: `GET /admin/workflows?state=waiting`.
- [ ] Each card shows: candidate name, what we're waiting for (joining form / offer / BGV), sent_at relative ("3 days ago"), reminders sent count, last reminder time.
- [ ] Manual actions per card: **Resend** (re-trigger email), **Cancel workflow** (with confirm modal + reason capture), **Mark as received** (debug-only, behind dev flag).
- [ ] Visual: amber-coloured card border; clock icon.

### Files touched
- Each of these onboarding graphs gains an interrupt after its "send" step:
  - `trigger_joinee_form_graph.py` (already has interrupt? verify)
  - `send_offer_letter_graph.py`
  - `send_loi_graph.py` (appointment letter)
  - (BGV graph doesn't exist yet — Phase 4 work)
- NEW: `zimyo_ai_assistant/hrms_agents/api/webhooks.py`
- NEW: `zimyo_ai_assistant/services/core/dunning.py` (cron job)
- NEW: `zimyo_ai_frontend/src/components/WaitingCandidateCard.jsx`
- `zimyo_ai_frontend/src/pages/admin/MissionControl.jsx`

### Testing
**Unit:**
- `test_webhooks_joining_form.py` — valid payload resumes graph; invalid HMAC rejected; duplicate event_id no-op.
- `test_dunning.py` — only reminds after threshold; respects max-3 cap.

**Integration:**
- Full e2e: trigger joining form for fake candidate → assert graph at interrupt → POST webhook → assert graph advances to next step → assert activity log has `form_sent` + `form_submitted` + `step_completed`.
- Offer reject path: POST webhook with `decision=rejected, reason="competing offer"` → assert graph takes reject branch → assert workflow ends with `outcome=rejected` → assert `episodes` entry written.

**Manual:**
- Pick a candidate, trigger joining form, wait 1min, check Mission Control → see "Waiting on candidate" card.
- Hit dev "Mark as received" → card disappears, next step begins.
- Open two browser tabs of Mission Control, approve in tab A → tab B updates (needs Phase 5 for true real-time; for Phase 3, accept a polling refresh).

### Done when
- All 4 webhooks deployed and HMAC-verified.
- Dunning emails actually go out.
- Mission Control accurately reflects waiting state.
- A workflow can survive a 7-day candidate delay and still resume cleanly (timer-based integration test fast-forwards clock).

---

## Phase 4 — Offer reject + cancel branches in graph (3 days)

**Goal:** every "send + wait + decide" loop has explicit branches for accept / reject / timeout. Reject doesn't crash — it gracefully closes the workflow with an audit-friendly outcome.

### Backend tasks
- [ ] Update `send_offer_letter_graph.py` topology:
  ```
  draft_offer → send_email → INTERRUPT(awaiting_candidate, offer_decision)
                                            │
                       ┌────────────────────┼────────────────────┐
                       ▼                    ▼                    ▼
                accepted_branch      rejected_branch      timeout_branch
                       │                    │                    │
                  next_workflow_step   notify_hr +          escalate_to_admin
                                       close_workflow       (interrupt asking
                                                            admin to decide)
  ```
- [ ] Same shape for `send_loi_graph` (appointment letter), `trigger_joinee_form_graph` (joining form has accept/reject? clarify — typically only submit / no-show).
- [ ] BGV graph (NEW — `bgv_graph.py`): `trigger_vendor → INTERRUPT(awaiting_candidate, bgv_report_ready) → branch on verdict`. Discrepancy branch surfaces as `needs_approval` interrupt for admin to decide.
- [ ] Add a `cancel_workflow` API endpoint: `POST /workflows/{thread_id}/cancel` → posts `Command(goto="cancel_node")` (every graph adds a `cancel_node` that emits `workflow_cancelled` + writes terminal episode with `outcome:"cancelled", reason:"..."`).

### Frontend tasks
- [ ] In Mission Control, add "Cancel workflow" button on any active card (running OR waiting). Confirmation modal asks for reason; reason ends up in `activity_log.payload.reason` and `episodes.outcome_reason`.
- [ ] Reject path: when a candidate-side reject webhook fires, card moves from "Waiting on candidate" → briefly to "Running now" (during cleanup) → disappears (or shifts to a "Recently closed" footer section with last 5).

### Files touched
- `zimyo_ai_assistant/hrms_agents/agents/onboarding/graphs/send_offer_letter_graph.py`
- `zimyo_ai_assistant/hrms_agents/agents/onboarding/graphs/send_loi_graph.py`
- NEW: `zimyo_ai_assistant/hrms_agents/agents/onboarding/graphs/bgv_graph.py`
- NEW: `zimyo_ai_assistant/hrms_agents/agents/onboarding/nodes/cancel.py` (shared cancel node)
- `zimyo_ai_assistant/hrms_agents/api/workflows.py` — add cancel endpoint
- `zimyo_ai_frontend/src/components/WorkflowCard.jsx` — Cancel button

### Testing
**Unit:**
- Each branch hit deterministically with mocked `Command(resume=...)`.

**Integration:**
- Accept path: webhook → next step runs.
- Reject path: webhook → workflow closes → episode written → activity log shows `offer_rejected` + `workflow_cancelled`.
- Timeout path: simulate 14-day no-response → escalates to admin needs-approval.
- Cancel mid-running: admin cancels while step 5 of 9 → completed steps remain logged, workflow marked cancelled.

**Manual:**
- Reject an offer → confirm card disappears, episode in DB, activity log row clickable shows the reason.

### Done when
- 100% of candidate-decision graphs have accept/reject/timeout branches.
- Cancel works at any state and never corrupts checkpoint.

---

## Phase 5 — Real-time UI sync (3 days)

**Goal:** when state changes anywhere (admin in another tab, candidate via webhook, agent advancing autonomously), Mission Control / Approvals / Activity all update without manual refresh.

### Backend tasks
- [ ] **Server-Sent Events** endpoint: `GET /admin/events?org_id=&since=` — streams `event-type: activity` lines whenever a new activity row is written.
- [ ] Reuse the Phase 1 activity emitter — same in-process queue feeds both Mongo writer and SSE fan-out. (Cleaner than polling Mongo.)
- [ ] Per-connection filter: client can subscribe to a workflow_id or candidate_id to limit firehose volume.
- [ ] Reconnect logic: client passes `Last-Event-ID`; backend replays missed events from `activity_log` since that id.

### Frontend tasks
- [ ] `useEventStream(orgId)` hook in `zimyo_ai_frontend/src/hooks/`. Reconnects on disconnect with exponential backoff.
- [ ] Mission Control subscribes and patches its local state on each event (card moves between sections, counters update, toasts).
- [ ] Approvals page subscribes; auto-removes a card if `plan_approved` for that workflow arrives.
- [ ] Activity page prepends new rows as they stream.
- [ ] Make the existing "Spawned 1 agent" toast clickable → deep link to the relevant card (`#workflow-{id}` anchor + auto-scroll).

### Files touched
- NEW: `zimyo_ai_assistant/hrms_agents/api/events.py` (SSE)
- NEW: `zimyo_ai_frontend/src/hooks/useEventStream.js`
- `zimyo_ai_frontend/src/pages/admin/MissionControl.jsx`
- `zimyo_ai_frontend/src/pages/admin/Approvals.jsx`
- `zimyo_ai_frontend/src/pages/admin/Activity.jsx`

### Testing
**Unit:**
- SSE event marshalling, Last-Event-ID replay logic.

**Integration:**
- Two browser sessions: approve in A → assert B updates within 500ms (Playwright test).
- Disconnect mid-stream, reconnect with `Last-Event-ID` → assert no events missed.

**Manual:**
- Two tabs open, candidate-side webhook fires → both tabs see card transition Waiting → Running.

### Done when
- Zero manual page-refreshes needed during a full onboarding demo.
- SSE survives flaky network (test by toggling wifi).

---

## Phase 6 — Interrupt type differentiation + escalations (2 days)

**Goal:** "Needs Approval" inbox visually distinguishes the 3 interrupt types so admin scans in seconds, not minutes.

### Backend tasks
- [ ] Standardize interrupt payload `type` field across all graphs:
  - `plan_approval` (initial or replanning)
  - `input_needed` (tool returned ambiguous / missing data mid-run)
  - `decision_needed` (BGV discrepancy, candidate rejected, timeout escalation, tool failed)
- [ ] All `interrupt()` callsites carry this type + a `severity` field (info / warning / blocking).

### Frontend tasks
- [ ] Card top-strip badge: 🟡 Plan approval / 🔵 Input needed / 🔴 Decision needed.
- [ ] Sort: blocking decisions first, then inputs, then plan approvals; within each, oldest first (FIFO fairness).
- [ ] Filter chips on Approvals page: All / Plan / Inputs / Decisions.
- [ ] Empty state per filter.

### Testing
**Manual + visual regression:**
- Generate one of each type in dev → screenshot diff against baseline.

### Done when
- Admin can answer "what's blocking me right now" in <5 seconds by glancing at the inbox.

---

## Phase 7 — Settings: agent defaults + memory inspector (3 days)

**Goal:** admin can view + edit what the agent has learned about their org and their prefs. Memory becomes legible, not magical.

### Frontend tasks
- [ ] New page `/admin/settings/agent-defaults`:
  - **My defaults** card — admin can override the auto-learned `admin_prefs` fields explicitly.
  - **Org rules** card — admin can edit `org_rules` (mandatory steps, allowed vendors, salary bands).
  - **Episodic memory** read-only timeline — last 50 completed/cancelled workflows with outcome.
- [ ] "Forget" button per pref field — explicit reset to system default.

### Backend tasks
- [ ] CRUD endpoints over `agent_memory` table, scoped to org_id.
- [ ] Audit: every memory edit emits `activity_log` row (`event_type=memory_edited`).

### Testing
- Manual: edit a default → trigger new workflow → assert pre-fill reflects the new default.
- Multi-org isolation re-test.

### Done when
- Admin has full visibility + control over learned memory.

---

## Phase 8 — Polish & hardening (2 days)

**Goal:** burn down the cosmetic issues + edge cases enumerated during reviews.

- [ ] Empty-state copy for every list/section (Approvals, Mission Control, Activity, Waiting-on-candidate).
- [ ] Counter accuracy: left-nav badges (`Live Agents 3`, `Needs Approval 2`) match page contents under SSE.
- [ ] Approve/Reject confirmation: Reject requires a reason; "Approve & Run" double-press protection (disable button + show spinner).
- [ ] Page header counts: "Needs Approval (3)" not just "Needs Approval".
- [ ] Toast lifecycle: streaming → ready → dismissed (auto after 8s or on click).
- [ ] Long-form inline collapse: if a plan card exceeds 600px height, collapse with "View full plan ↓".
- [ ] Mobile breakpoint pass (one-column stack, no horizontal scroll).
- [ ] a11y pass: keyboard nav across cards, ARIA labels on icon-only buttons.

### Testing
- Visual regression snapshots updated.
- Lighthouse a11y ≥ 95 on each admin page.

---

## Phase 9 — Load + chaos testing (2 days)

**Goal:** prove the system holds at 100 concurrent active workflows per org.

- [ ] Synthetic load test: spin up 100 onboarding flows, 30% in waiting state, 40% running, 30% needing approval.
- [ ] Measure: SSE fan-out latency, activity-log write throughput, Redis checkpoint write contention.
- [ ] Chaos: kill the FastAPI process mid-run → restart → assert all checkpointed workflows resume cleanly.
- [ ] Chaos: stop Mongo primary for 30s → assert activity-log batches queue in-process + flush on recovery, no events lost (in-memory queue cap: 10k; alert if breached).

### Done when
- p95 plan-draft → render < 1.5s under 100-flow load.
- Zero lost activity rows after PG outage of 30s.
- Zero lost workflow state after FastAPI restart.

---

## Candidates page (`/admin/candidates`) — roster + bulk launcher

### Data source
Candidate roster comes from **existing Zimyo** `POST /apiv2/onbording/dashboardDataV2` — already wrapped by `hrms_agents/tools/api/onboarding.py::get_candidate_list(admin_user_id, workflow_id, page, filters)`. Don't duplicate it in our DB.

Filter dimensions (stage, workflow, custom fields) are discovered dynamically via `get_form_fields(admin_user_id)` — never hardcode dimension names.

### Backend endpoint
NEW thin route `GET /admin/candidates?workflow_id=&stage=&search=&from=&to=&page=` in `zimyo_ai_assistant/hrms_agents/api/admin/candidates.py`:
1. Call existing `get_candidate_list(...)` → Zimyo data
2. For each candidate, look up active workflow in our local `workflows` table (single query: `WHERE candidate_id IN (...) AND state != 'completed' AND state != 'cancelled'`)
3. Merge: each candidate gets an optional `active_workflow: {id, current_step, state, bulk_id} | null`

No new persistence — we read Zimyo + read our own workflow rows + join in memory.

### Status badge logic
The badge column has TWO sources merged:

| Condition | Badge shown | Source |
|---|---|---|
| Active workflow exists with state `awaiting_approval` | **Needs your attention** (violet) | our `workflows` |
| Active workflow exists with state `waiting_on_candidate` | **Waiting on candidate** (amber) | our `workflows` |
| Active workflow exists with state `running` | **In progress** (indigo) | our `workflows` |
| Active workflow completed | **Done** (green) | our `workflows.state = completed` |
| Zimyo marks candidate withdrawn | **Withdrawn** (grey) | Zimyo response field |
| No active workflow, not withdrawn | "—" / Zimyo's raw stage | passthrough |

Agent state takes precedence when active. "Withdrawn" is purely Zimyo's HR pipeline flag — not our `cancelled` workflow state (those are two different concepts; documented in [[reference-candidate-list-source]]).

### UI columns
| Col | Source |
|---|---|
| Checkbox (bulk select) | local |
| Candidate (avatar + name + role + email) | Zimyo |
| Currently on (current step + workflow name) | Zimyo |
| Status badge | merged (see above) — uses shared `<StatusBadge>` |
| Open → `/admin/candidates/{id}` | local nav |

Filters: search by name/email (Zimyo), workflow dropdown (Zimyo via `get_form_fields`), status dropdown (the 5 display labels above + "Any active workflow" + "No active workflow").

When rows selected, sticky `Launch an agent (N selected)` button triggers the bulk flow (next section).

### Phase fit
| Phase | Candidates-page work |
|---|---|
| 0 | Placeholder page, scaffolded `<StatusBadge>` component |
| 1 | Wire to `GET /admin/candidates` — Zimyo + workflow join live; badges accurate |
| 3 | `waiting_on_candidate` populates correctly once webhook pauses ship |
| 5 | SSE patches rows live as state transitions occur |
| 6 | Interrupt-type sub-tag on `awaiting_approval` rows |
| Bulk | Selection → `POST /workflows/bulk` |

### Files
- NEW: `zimyo_ai_assistant/hrms_agents/api/admin/candidates.py`
- NEW: `zimyo_ai_frontend/src/pages/admin/Candidates.jsx`
- NEW: `zimyo_ai_frontend/src/pages/admin/CandidateDetail.jsx` (drill-in)
- NEW: `zimyo_ai_frontend/src/components/StatusBadge.jsx`

### Testing
- Status accuracy: drive a candidate through every state, assert badge updates correctly
- Withdrawn precedence: candidate withdrawn in Zimyo while our workflow is `awaiting_approval` → **show Withdrawn** (Zimyo wins for terminal-side decisions); workflow auto-cancelled with reason="candidate withdrawn upstream"
- Bulk launch: tick 5 rows, click Launch → composite approval card lands in Needs Approval
- Workflow-state cache invalidation: state changes via SSE → row re-renders within 500ms

### Done when
- Single endpoint serves the page; no Zimyo duplication in our DB.
- Badge accurately reflects whichever source is most authoritative (agent state when active, Zimyo otherwise).
- `<StatusBadge>` is the only place workflow state is rendered across the app.

---

## Bulk onboarding ("onboard these 5 end-to-end")

Existing `hrms_agents/agents/onboarding/graphs/bulk_action_graph.py` handles **single-step** bulk (e.g. "send offer letter to 5") via `Send` fanout — admin confirms once, 5 parallel email sends inside one graph, parent waits for all. Works because each child is <5s.

**Full-workflow bulk** (9-step onboarding × 5 candidates) is different: a child can wait 7 days for a candidate signature. Parent graph cannot hold for 7 days. Pattern is **spawn-and-exit**, not Send-fanout.

### Topology
```
bulk_onboarding_supervisor (thread: bulk:{org}:{bulk_id})
    │
    ├── pull admin_prefs (1) + per-candidate episode search (asyncio.gather)
    ├── compose ONE composite approval form (sections per candidate, pre-filled)
    ├── pre-check 409 per candidate (auto-skip duplicates with a note)
    ├── interrupt(plan_approval, type="bulk_plan_approval")
    │       │
    │       ▼ admin approves
    ├── for each included candidate:
    │     graph.invoke(start=..., config={thread_id: "onboarding:{org}:{cid}"})
    │     emit activity {bulk_id, candidate_id, event:"workflow_started"}
    └── END (parent thread exits — children run independently)
```

Each child is a normal single-candidate onboarding workflow — same checkpointer, same webhooks, same memory writes. `bulk_id` is metadata stamped on activity rows and the `workflows` row, used only for filtering/grouping in the UI.

### UI surface
Composite card in Needs Approval:
- One approval card titled `Bulk onboarding · N candidates · #bulk_XXXX`
- Per-candidate collapsible section: pre-filled inputs + include/skip toggle + override fields
- Candidates with an existing active workflow auto-show as `Skip ⚠ already running #xxxx`
- CTA: `Approve & Run M of N` (reflects skip count)

Mission Control:
- Each spawned child becomes its own card in running/waiting sections
- Small tag chip on each card: `part of #bulk_XXXX` — clickable to filter view
- No "parent" card persists; bulk supervisor exits after spawn

### Activity log
Every child's events tagged with `bulk_id`. Admin can filter the Activity page by bulk_id to see the whole batch's audit trail in one stream.

### What changes in roadmap phases
| Phase | Bulk-related addition |
|---|---|
| 0 | 409 invariant must be **per-candidate**; bulk fanout must skip duplicates, not 400 the whole batch |
| 1 | `activity_log` and `workflows` get a nullable `bulk_id` column; activity filter API supports it |
| 2 | Memory reads parallelized via `asyncio.gather` for N candidates |
| 3 | No webhook changes — children resume independently |
| 5 | SSE filter supports `bulk_id` so admin can stream only one batch |
| 6 | Composite approval card is a new interrupt type variant (`bulk_plan_approval`) |

### New files
- `zimyo_ai_assistant/hrms_agents/agents/onboarding/graphs/bulk_onboarding_graph.py` (supervisor)
- `zimyo_ai_assistant/hrms_agents/agents/onboarding/nodes/bulk_onboarding.py` (compose / pre-check / spawn nodes)
- `zimyo_ai_frontend/src/components/BulkApprovalCard.jsx`

### Testing
- Spawn 5 children, confirm parent thread exits within 2s of approval.
- One of 5 has existing workflow → skipped, other 4 spawn cleanly.
- One child rejects offer day 2 → other 4 unaffected.
- Activity filter by bulk_id returns rows from all 5 children + parent.
- Load test: 20 admins each spawn 10-candidate bulk simultaneously → 200 parallel onboarding workflows, system holds.

### Limits (defaults; tunable per org)
- Max candidates per bulk approval form: **50** (UI scrolls, but compose-time gather slows beyond)
- Max concurrent fresh-spawn rate: **20/sec per org** (protects LLM rate limits during plan-draft burst)
- If admin tries 200-candidate bulk → server splits into 4 batches of 50, returns 4 approval cards

---

## Out of scope (explicitly deferred)

- Custom workflow builder UI (Workflows page) — keep current state, full redesign later.
- Multi-language candidate communication (English only Phase 1–9).
- AI-suggested template tuning (we learn defaults; we don't yet learn template wording).
- Cross-org analytics rollups (single-org dashboards only).
- Mobile-native admin app.

---

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Redis checkpointer fails silently (stock Redis vs RedisStack) | Medium | Already mitigated: `STRICT_CHECKPOINTER=1` aborts boot in prod. Add monitoring alert on MemorySaver fallback. |
| Activity log writes overwhelm DB | Low | Batched async writer + indexes on hot query paths. Add per-org rate limit if needed. |
| Webhook replay attacks | Medium | HMAC + event_id idempotency + replay window (reject events > 5min old). |
| Two admins approve same plan simultaneously | Low | Optimistic concurrency: resume endpoint checks workflow state is still `awaiting_approval`; second attempt 409s. |
| Memory pre-fill misleads admin into approving stale defaults | Medium | Hint chip explicitly says "Suggested from your past picks" — never silent. |
| SSE connection ceiling per pod | Low | Use connection pooling; scale horizontally. p99 50 connections/pod is fine. |

---

## Order of merge

```
Phase 0 ─┬─ Phase 1 ─┬─ Phase 2 ─┬─ Phase 3 ─┬─ Phase 4 ─┬─ Phase 5 ─┬─ Phase 6 ─┬─ Phase 7 ─┬─ Phase 8 ─┬─ Phase 9
         │           │           │           │           │           │           │           │           │
         │           │           │           │           │           │           │           │           │
        rename     activity   memory     waiting     reject     real-time   types    settings   polish    load
                   log        store      cards       branches   sync                  page
```

Each phase's PR title prefix: `[phase-N] ...`. PR description must include:
- What changed (1-2 lines)
- Test plan executed (manual + automated)
- Activity-log events added (if any)
- Migration applied (if any) + rollback statement

---

## Definition of "done" for the whole roadmap

- ✅ Admin can onboard a candidate end-to-end via natural language ("let onboard Neil"), see the plan, approve once, and the workflow runs autonomously across days/weeks.
- ✅ Every action by anyone is queryable in Activity log within 1s of occurring.
- ✅ Agent learns admin preferences across runs without explicit teaching.
- ✅ Candidate-side delays don't break anything; workflows resume cleanly.
- ✅ Two admins can collaborate in real time without stale state.
- ✅ Production runs survive process restarts and DB blips without losing state.

---

_Last updated: 2026-05-18 — Akash Tyagi_
