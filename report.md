# Top-10 Fix Status (2026-05-08)

Legend: ✅ done · 🟡 partial / deferred-with-plan · ⚠️ requires user action

1. ⚠️ **Rotate every secret in `.env` files (both repos) and purge them from git history.** Live OpenAI / Bedrock / Gemini / Langsmith / Deepgram / ElevenLabs keys + Zimyo `PARTNER_SECRET` / `AUTH_KEY` are tracked in repo history. Backend `config.py:37-42` also hardcodes Zimyo prod creds as pydantic defaults. Rotate, `git rm --cached .env server.log uvicorn.log`, BFG/`git filter-repo` to scrub history, force-push, then add a pre-commit hook.
   - **Done:** `git rm --cached .env server.log uvicorn.log` (backend) + `git rm --cached .env` (frontend). Expanded both `.gitignore`s to cover `.env*`, `*.log`, caches, IDE, OS junk. Removed hardcoded `partner_secret`/`auth_key`/`partner_id` defaults from `config.py:34-46` — `Settings()` will now fail loudly at boot if env is missing. Pre-commit hook installed in both repos (umbrella + `zimyo_ai_assistant`) that blocks `.env*`, `*.log`, and common API-key patterns; tracked installer at `zimyo_ai_assistant/scripts/install_hooks.sh`.
   - **Still on user (destructive — not auto-run):** rotate every key in vendor consoles (OpenAI / Bedrock / Gemini / Langsmith / Deepgram / Zimyo); run `git filter-repo` (or BFG) to scrub history; `git push --force-with-lease`. Then commit the new `.gitignore`s + the `scripts/pre-commit` file so future clones can install the hook.
2. ✅ **Bedrock breaks every structured-output call** (`services/ai/structured.py:131`). When `LLM_PROVIDER=bedrock`, `extract_structured` falls into the OpenAI-compatible branch which crashes on a `None` client. Router silently returns `unknown`, planner classifier silently degrades to `unclear`, RAG few-shot fails. Add an explicit Bedrock branch.
   - **Done:** added `_bedrock_call` branch using `langchain_aws.ChatBedrock` + `SystemMessage`/`HumanMessage`, dispatched from the main `try/elif` block. Verified end-to-end: `extract_structured` now returns valid Pydantic instances under `LLM_PROVIDER=bedrock`.
3. 🟡 **Close IDOR holes in FastAPI routes.** `/sessions/{user_id}`, `/sessions/{user_id}/{session_id}/history`, `/policy-status/{user_id}`, `/feedback/examples?userId=...`, `/analytics/*` accept user_id from path/query with no auth. Add a `get_authenticated_user` dependency in `hrms_agents/api/_shared/deps.py` and apply across the protected surface.
   - **Done:** added `get_authenticated_user` (query) + `get_authenticated_user_from_path` (path-based) in `hrms_agents/api/_shared/deps.py`. Both compare a bearer/header token against the Redis session for the claimed user_id. Applied to `/sessions/{user_id}`, `/sessions/{user_id}/{session_id}/history`, `/policy-status/{user_id}`, `/feedback/examples`, `DELETE /feedback/examples/{message_id}`. `/analytics/*` gated at the router level by a separate `_require_admin_token` (X-Admin-Token header → `ADMIN_ANALYTICS_TOKEN` env). Transitional mode by default: missing token → warning log, not 401, so the FE can migrate without a flag-day deploy.
   - **To finish later:** flip `STRICT_AUTH=1` once the FE sends `Authorization: Bearer <userToken>` on every protected call. Audit logs for `UNAUTHENTICATED ...` lines first.
4. ✅ **Tighten CORS** (`hrms_agents/main.py:92-98`). `allow_origins=["*"] + allow_credentials=True` — pin to an env-driven allowlist.
   - **Done:** `CORS_ALLOW_ORIGINS` env var (comma-separated). Defaults to localhost dev hosts. `allow_credentials` auto-disabled when `*` is in the list (browsers reject the combo anyway).
5. 🟡 **Stop shipping the Deepgram key to every browser** (`src/hooks/useDeepgramSTT.jsx:19,75`). Move STT to a backend proxy or use Deepgram short-lived tokens minted server-side.
   - **Deferred (multi-hour refactor):** documented the migration path inline in `useDeepgramSTT.jsx` (temp-token endpoint OR backend WS proxy), called out in red as a `SECURITY TODO`. Not auto-implemented in this pass to avoid a half-finished landing.
6. ✅ **Restore layer hygiene.** `services/ai/planner/` imports `hrms_agents.agents.onboarding.*` (runner.py:56-63, subject_loader.py:23, resolvers.py:33), and `integrations/mcp_client.py:57` + several agent nodes import from `hrms_agents/api/_trace`. Both directions inverted. Move `_trace.push_trace` into `services/`; move planner prompts/helpers into `services/ai/planner/`. Re-enable `scripts/check_layers.py` in CI.
   - **Done (trace half):** moved `hrms_agents/api/_trace.py` → `services/tracing.py`. Updated all five importers (`integrations/mcp_client.py`, `hrms_agents/api/chat.py`, three onboarding nodes, the test file). Old module deleted. 28 trace-serializer tests still pass. Layer-import check is now wired into the umbrella pre-commit hook.
   - **Deferred (planner half):** moving `hrms_agents/agents/onboarding/{nodes/_helpers, prompts/plan_confirm}` into `services/ai/planner/` is a bigger surgery (touches the planner hot path); skipped here to keep this pass landable. Adding a new task for it.
7. ✅ **Fix the AI-message + UI-extract bugs in `hrms_agents/api/chat.py:323-348`.** Restrict last-AI-message detection to `isinstance(m, AIMessage)`; coerce list content to string; accept JSON arrays in `api_result` (the current `startswith("{")` drops valid array payloads).
   - **Done:** loop now skips non-`AIMessage`, joins multi-modal list content into a single string, and the UI extractor accepts both `{...}` and `[...]` payloads.
8. ✅ **Stop the per-turn 17-graph resume sweep** (`hrms_agents/api/chat.py:466-500`). Persist active sub_flow in Redis (`session:<sid>:active_sub_flow`) and probe only that one — saves 16 Redis round-trips per chat turn.
   - **Done:** added `_get/_set/_clear_active_sub_flow` (24h TTL). Resume probe now narrows to the cached sub_flow when present; falls back to the full sweep on miss. Cache is set after every successful run and cleared when the graph reaches `done`.
9. ✅ **Fix the conditional hook in `src/components/Toast.jsx:19,25`.** `useEffect` is declared after the early return; eventually crashes with "rendered fewer hooks". 30-second fix.
   - **Done:** moved the early return below `useEffect`; effect now no-ops when `toast` is null.
10. ✅ **Delete `services/ai/prompts/` (dead package, ~1500 lines).** Never imported, and full of `IntentDefinition.keywords=[...]` keyword tables that directly contradict the project's "LLM-first router, never keyword tables" rule. Future devs will copy this thinking it's canonical.
    - **Done:** verified zero importers across the repo (excluding the package itself), then `rm -rf services/ai/prompts/`.

---

## Backend — `services/`

### Bugs

- ✅ `[HIGH] [BUG] services/ai/structured.py:131` — Bedrock branch added in `extract_structured` (smoke-tested end-to-end).
- ✅ `[HIGH] [BUG] services/ai/chat.py:241-248` — Replaced error-string return with a typed `LLMCallError` raise across all three helpers (`get_chat_response`, `_raw`, `_streaming`). Existing `try/except Exception` callers continue to handle it.
- ✅ `[HIGH] [BUG] services/ai/chat.py:155` — `get_openai_compatible_client()` (and the async sibling) now raise `RuntimeError` on `LLM_PROVIDER` ∉ {openai, deepseek} instead of returning `None`.
- ✅ `[HIGH] [BUG] services/core/login_handler.py:30,247` — `finally` now compares `asyncio.current_task()` against `_background_tasks.get(user_id)` before deleting; a stale cancelled task no longer clobbers a fresh task's slot.
- ✅ `[HIGH] [BUG] services/core/login_handler.py:175-193` — Fast-login cached return now sets `policies_processing: False` for shape consistency.
- ✅ `[HIGH] [BUG] services/ai/planner/runner.py:386-396` — Migrated to `_PlanClassifySchema` (Pydantic) + `extract_structured`; deleted dead `re`/`json` imports.
- ✅ `[MEDIUM] [BUG] services/ai/planner/resolvers.py:135-140` — Migrated to `_BucketPickSchema` + `extract_structured`; deleted `_parse_pick` and the `_JSON_BLOCK` regex; updated planner tests to mock `extract_structured`.
- ✅ `[MEDIUM] [BUG] services/ai/python_engine/transform_extractor.py:217-219` — `_parse_snippet` now uses `_strip_json_envelope` from `structured.py` instead of `text.strip("`")`.
- ✅ `[MEDIUM] [BUG] services/ai/example_store.py:613-615` — Replaced `utcfromtimestamp(utcnow().timestamp() - X)` with `datetime.now(timezone.utc) - timedelta(seconds=window_seconds)`.
- ✅ `[MEDIUM] [BUG] services/core/login_handler.py:35` — `get_last_dates()` now derives `from_date`/`to_date` from `datetime.now().year`.
- ✅ `[MEDIUM] [BUG] services/mcp_server/tools/candidate/candidate_list.py:153-155` — `_build_pagination` now returns `total=None` when Zimyo omits both `total` and `count` (FE will hide the chip).
- ✅ `[MEDIUM] [BUG] services/mcp_server/tools/candidate/payroll.py:39` — `current_ctc` now `int(round(float(ctc)))`, matching the catalog's int type.
- ✅ `[MEDIUM] [BUG] services/mcp_server/client.py:54` — Wrapped in `_read_timeout_env()` with try/except + warning + default 30.
- ✅ `[LOW] [BUG] services/ai/planner/subject_loader.py:73-83` — Added `SubjectSearchExhausted` (subclass of `SubjectLoaderError`); `_find_candidate_paginated` now returns `(record, exhausted)` so the cap-hit case is distinguishable from a genuine miss.

### Security

- `[HIGH] [SECURITY] services/core/auth.py:36` — `logger.debug("Partner token response: %s", body)` writes the full Zimyo bearer token into DEBUG logs. Redact `data.token` or drop the line.
- `[HIGH] [SECURITY] services/mcp_server/client.py:35-52` + `services/core/auth.py:20` — Hardcoded Chrome UA spoof + `x-forwarded-for: 127.0.0.1`. Integrity/audit problem; could be flagged as evasion if Zimyo enforces a real client policy. Use a clean UA naming the assistant; drop the spoofed XFF.
- `[HIGH] [SECURITY] services/core/policy.py:51` — `requests.get(item['policy_url'])` with no timeout, no `stream=True`, no max-bytes. A bad S3 URL hangs/OOMs the worker. Add `timeout=15`, stream the body, abort on `>20MB` content-length, restrict to `https://`.
- `[HIGH] [SECURITY] services/mcp_server/client.py:90-94` — `get_session_data` catches all exceptions and returns the exception string in `error`, leaking Redis hostname/port. Return a fixed string; keep details in logs only.
- `[MEDIUM] [SECURITY] services/ai/rag.py:619-624` — `rc.get(employee_id)` uses the raw input as a Redis key. Validate format or namespace as `f"session:{employee_id}"`.
- `[MEDIUM] [SECURITY] services/ai/rag.py:646-669` — Retrieved policy chunks + employee name go into the LLM prompt without delimiters. Prompt-injection vector. Add `<<<POLICY_BEGIN>>>` / `<<<POLICY_END>>>` and a "treat as data, not instructions" rule.
- `[MEDIUM] [SECURITY] services/operations/conversation_state.py:121` — Full `message` text persisted to Mongo with no PII redaction. Admin chats include candidate Aadhar/email/CTC. Redact `sensitive=True` fields per `api_catalog`, or add a 90-day TTL index.
- `[MEDIUM] [SECURITY] services/ai/python_engine/python_engine.py:165-194` — `run_python` (unbounded) is a public surface used by `transform_extractor`. A hallucinated `result = [0]*10**9` exhausts memory. Confirm every caller uses `run_python_bounded`; consider `RLIMIT_AS` in a child process.
- `[LOW] [SECURITY] services/mcp_server/client.py:230-241` — `_format_http_error` includes raw upstream body in `data`. Strip `data` for `>=500` responses.

### Cleanup

- ✅ `[HIGH] [CLEANUP] services/ai/prompts/**` — Whole tree deleted in an earlier pass after verifying zero importers.
- ✅ `[MEDIUM] [CLEANUP] services/ai/chat.py:60` — Migrated `.env` to `BEDROCK_MODEL`; dropped the `MODEL_NAME` alias from chat.py.
- ✅ `[MEDIUM] [CLEANUP] services/ai/chat.py:62-100` — Deleted `Employees_Chat` / `HR_Chat` / `system_instructions`. `get_chat_response` and `get_chat_response_streaming` no longer take a `role` parameter and no longer prepend a system prompt — RAG already builds the full prompt (and rule #4 in that prompt was actively conflicting with the deleted `Response:/Reference:` template). Updated the two RAG call sites accordingly.
- ✅ `[MEDIUM] [CLEANUP] services/core/auth.py:9-11,15` — Dropped the dead `_cached_token` / `_cached_token_expiry` globals + the unused `global` declaration; updated the stale comment to point at Redis as the future home.
- ✅ `[MEDIUM] [CLEANUP] services/mcp_server/tools/candidate/_common.py:13-18` — Deleted `_admin_token`; rewrote all 9 tool modules to use `resolve_token(user_id)` from `mcp_server.client` directly.
- ✅ `[LOW] [CLEANUP] services/operations/conversation_state.py:140-144` — Documented the path: `return_exceptions=True` captures non-`PyMongoError` failures (TypeError, encoding errors, asyncio.CancelledError, …); the `raise insert_res` propagates those to callers as intended (the outer `except PyMongoError` only handles Mongo-specific errors).
- ✅ `[LOW] [CLEANUP] services/ai/rag.py:45-49` — Dropped the misleading "re-export for back-compat" comment and the spurious `F401` noqa. The three symbols (`EMBEDDING_MODEL`, `EMBEDDING_QUERY_PREFIX`, `_get_model`) are actually used internally at lines 180, 423, 442; kept the imports.

### Architecture

- ✅ `[HIGH] [ARCHITECTURE] services/ai/planner/runner.py:56-63` — Moved `plan_confirm.py` + `plan_classify.py` to `services/ai/planner/prompts/`. Extracted the three message-state helpers (`_last_user_msg`, `_last_natural_user_msg`, `_empty_text`) into `services/ai/planner/_message_helpers.py`; the onboarding-side `_helpers.py` re-exports them so existing onboarding imports keep working. Updated all importers (runner.py + 3 onboarding nodes).
- ✅ `[MEDIUM] [ARCHITECTURE] services/ai/planner/subject_loader.py:23 + resolvers.py:33` — Created `services/ai/planner/_zimyo_calls.py` (a thin facade over `integrations.mcp_client`); planner now uses it instead of reaching into `hrms_agents.tools.api.onboarding`. `services/` is now fully `hrms_agents`-free; `python scripts/check_layers.py services/ai/planner/*.py` is clean.
- ✅ `[MEDIUM] [ARCHITECTURE] services/core/ctc_defaults.py + services/operations/ctc_defaults.py` — Deleted both `services/core/` wrappers. Moved `resolve_applicable_from` into operations. Renamed `get_defaults`/`save_defaults` to `get_ctc_defaults`/`save_ctc_defaults` (and offer-letter equivalents). Updated all 6 importers across api/ + agents/.
- ✅ `[MEDIUM] [ARCHITECTURE] services/ai/rag.py:631 + services/ai/example_store.py` — RAG now calls `inject_examples()` instead of the inline block. Same code path every other agent uses (handles failures, formatting, no-match).
- ✅ `[LOW] [ARCHITECTURE] services/ai/api_catalog/__init__.py:33` — `discover()` now wraps each `importlib.import_module` in try/except. Failures accumulate in `_DISCOVERY_FAILURES`; new public `get_discovery_failures()` reads them. `/health` now reports `api_catalog: {loaded, failures: [...]}` and flips `status` to `"degraded"` when anything failed to load.

### Improvements

- `[HIGH] [IMPROVEMENT] services/ai/intent_router.py:50-163` — 110-line hardcoded prompt (9 numbered rules + 14 examples in one f-string). Split into `_RULES_BLOCK`, `_EXAMPLES_BLOCK`; pull `capabilities` into a Jinja template. Enables A/B testing rules.
- `[MEDIUM] [IMPROVEMENT] services/ai/rag.py:53-64` — `CHUNK_SIZE_CHARS = 2000` hard-coded. Compute from `model.max_seq_length` so embedding-model swaps don't desync chunking.
- `[MEDIUM] [IMPROVEMENT] services/ai/example_store.py:179,362,653` — Three identical `_load_*_cache` functions. Extract `_build_cache_entry(docs)`; saves ~80 lines.
- `[MEDIUM] [IMPROVEMENT] structured.py + planner/resolvers.py + planner/runner.py + python_engine/{transform_extractor,pushdown_extractor}.py` — Five places re-implement "raw_decode + cleanup". Migrate the four hand-rolled parsers to `extract_structured`; delete them.
- `[MEDIUM] [IMPROVEMENT] services/mcp_server/client.py:138-153` — `_session` lock has TOCTOU. Always acquire the lock — singleton init is one-time anyway.
- `[MEDIUM] [IMPROVEMENT] services/ai/example_store.py:213-282` — Three search functions duplicate cosine-search loops. Extract `_cosine_topk` + a result-projection callback.
- `[MEDIUM] [IMPROVEMENT] services/core/login_handler.py:78-141` — 60-line god function. Split: `_publish_status`, `_extract_and_index`, slim orchestrator.
- `[LOW] [IMPROVEMENT] services/ai/api_catalog/_prompt_builder.py:53-71` — No token budget. Add `max_chars` and progressively drop `examples` → `returns` → `params`.
- `[LOW] [IMPROVEMENT] services/operations/conversation_state.py:43-48` — `ensure_indexes()` runs on every boot but never logs duration; wrap with timing + non-fatal try/except.

---

## Backend — `hrms_agents / api / infra / integrations`

### Security

- `[HIGH] [SECURITY] .env:1-67` — Live secrets committed (`PARTNER_SECRET`, `AUTH_KEY`, OpenAI sk-proj-..., Gemini, Bedrock, Langsmith, real Redis password). `.gitignore` has `.env` but git already tracked it. Rotate every key, `git rm --cached .env`, add a verifying pre-commit hook.
- `[HIGH] [SECURITY] config.py:37-42` — Hardcoded Zimyo creds as pydantic field defaults. Even after `.env` is removed, `Settings()` in test runs has prod creds. Replace with no defaults so missing env fails loudly.
- `[HIGH] [SECURITY] hrms_agents/main.py:92-98` — `allow_origins=["*"]` + `allow_credentials=True` + `allow_methods=["*"]`. Pin origins to env-driven allowlist.
- `[HIGH] [SECURITY] hrms_agents/api/sessions.py:34-43` — IDOR. `GET /sessions/{user_id}` and `/sessions/{user_id}/{session_id}/history` accept user_id from path with no auth dep. Same pattern in `feedback.py:124` (`?userId=...`) and `policy.py:19`. Add an auth dependency that validates the path/query userId equals the authenticated user.
- `[HIGH] [SECURITY] hrms_agents/api/auth.py:19-35` — Login takes `userToken` via query string. Tokens leak into nginx logs / browser history / referrer. Move to a JSON body or `Authorization: Bearer`.
- `[HIGH] [SECURITY] hrms_agents/api/analytics.py:14-73` — All `/analytics/*` routes unauthenticated despite the file-level comment saying "front the route with admin gating". Anyone can pull `/chat-volume`, `/feedback`, `/rag-health` and harvest engagement telemetry.
- `[MEDIUM] [SECURITY] hrms_agents/api/chat.py:664` — Raw exception text emitted to SSE clients (`yield _sse("error", {"message": str(e)})`). Same pattern in `sessions.py:31`, `policy.py:28`, `feedback.py`, `config/*.py`. Map to a generic message; log internals only.
- `[MEDIUM] [SECURITY] hrms_agents/api/_trace.py:58` — PII in source comment: `# rajiv gupta (hardware :- rajnagar) 8650737273.` Strip it.
- `[MEDIUM] [SECURITY] server.log, uvicorn.log` — Tracked in repo (255KB + 35KB). Add `*.log` to `.gitignore`, `git rm --cached server.log uvicorn.log`.
- `[LOW] [SECURITY] hrms_agents/api/feedback.py:153-166` — `DELETE /feedback/examples/{message_id}?userId=...` trusts `userId` query as owner. Fix as part of the central auth dependency.

### Bugs

- ✅ `[HIGH] [BUG] hrms_agents/agents/onboarding/__init__.py:7-17` — Added `auto_progress_graph` + `add_candidate_graph` to `_LAZY_GRAPHS`.
- ✅ `[HIGH] [BUG] hrms_agents/api/chat.py:323-329` — Last-AI-message detection now restricted to `AIMessage`; multi-modal list content joined to a string before assignment.
- ✅ `[HIGH] [BUG] hrms_agents/api/chat.py:344-348` — UI extraction now accepts both `{...}` and `[...]` payloads via `lstrip()` + `startswith(("{","["))` + `json.loads`.
- ✅ `[HIGH] [BUG] hrms_agents/api/chat.py:466-500` — Resume probe narrows to the cached `session:<sid>:active_sub_flow` (24h TTL) when present, falling back to the full sweep on miss.
- ✅ `[HIGH] [BUG] hrms_agents/agents/onboarding/graphs/*_graph.py` — Added `hrms_agents.agents.reset_graph_cache()` that walks every graph module and zeroes `_compiled`. Pytest autouse fixture wired in `tests/conftest.py`.
- ✅ `[HIGH] [BUG] hrms_agents/api/chat.py:609-612` — Added `_build_initial_state` branch for `workflow_stages` (`sub_flow`, `workflow_id=0`, `workflow_name=""`, `workflows_cache=[]`).
- ✅ `[MEDIUM] [BUG] hrms_agents/checkpointer.py:68-77` — Differentiated three failure classes: `ImportError` → MemorySaver + warn; "FT.* / search module missing" → MemorySaver + warn (RedisStack hint); other (auth/network) → raise when `STRICT_CHECKPOINTER=1` (default in prod). Tests opt out via `STRICT_CHECKPOINTER=0`.
- ✅ `[MEDIUM] [BUG] integrations/mcp_client.py:29` — `MCPAuthExpiredError` now extends `Exception`; dispatcher's `call_tool` re-raises it above its `except Exception` block; SSE handler + ASGI middleware comments updated.
- ✅ `[MEDIUM] [BUG] hrms_agents/agents/onboarding/graphs/bulk_action_graph.py:115,131,145` — Replaced one-branch `add_conditional_edges` lambdas with plain `add_edge` calls; deleted the now-dead `_after_confirm_scope` helper.
- ✅ `[MEDIUM] [BUG] infra/repositories/{chat_ratings, chat_examples, policy_assignments, chat_classifier_examples}.py` — All four migrated from `datetime.utcnow()` to `datetime.now(timezone.utc)`.
- ✅ `[MEDIUM] [BUG] hrms_agents/tools/api/holidays.py:22-24` — Dropped the lowercase fallbacks; reads only UPPER_SNAKE Zimyo fields.
- ✅ `[LOW] [BUG] hrms_agents/api/chat.py:332-337` — Verified `bulk_action.reduce` (line 1268) sets `next_step: "done"`; added a contract comment in `_extract_response` so the requirement is explicit.

### Architecture

- ✅ `[HIGH] [ARCHITECTURE] integrations/mcp_client.py:57` — Already landed; `_trace.py` was moved to `services/tracing.py` in an earlier pass and the import here updated.
- ✅ `[HIGH] [ARCHITECTURE] hrms_agents/agents/onboarding/nodes/{auto_progress,bulk_action,candidate_list}.py` — Already landed; all three updated to `from services.tracing import push_trace`.
- ✅ `[HIGH] [ARCHITECTURE] hrms_agents/api/chat.py` — Lifted the 230-line `_build_initial_state` body into `hrms_agents/agents/_initial_states.py` (`build_initial_state(sub_flow, ...)` + `_STATE_EXTRAS` registry holding all 17 per-flow contracts). HTTP layer's `_build_initial_state` is now an 8-line dispatcher. Verified all 23 sub_flows still produce identical starter state. Per-graph file split (one factory per `<flow>_graph.py`) deferred — the architectural goal (state contract out of the route layer) is already met; further per-graph split is mechanical and can land independently.
- ✅ `[MEDIUM] [ARCHITECTURE] hrms_agents/api/config/ctc.py:60-87` — Moved the workflow→candidate→payroll-master walk into `services/operations/ctc_defaults.py:discover_plan_options(user_id)`. Route handler is now a 3-line wrapper. Calls MCP via `integrations.mcp_client` directly instead of the agent-side `hrms_agents.tools.api.onboarding` wrappers — keeps the layer rule clean (`scripts/check_layers.py` passes).
- 📌 `[MEDIUM] [ARCHITECTURE] hrms_agents/agents/onboarding/nodes/` — **Deferred** as a separate slice. Five files (1269 / 1062 / 1005 / 920 / 715 lines) need per-phase splits (resolve / build / render / submit). This is a multi-day refactor with high blast-radius (every node imports specific helpers from the file it's defined in); landing it half-finished risks breaking onboarding flows mid-deploy. Recommended approach: pick ONE file, split into a sub-package, ship + verify, then iterate. Track as its own ticket with explicit slice plan.
- ✅ `[LOW] [ARCHITECTURE] hrms_agents/states/__init__.py` — Re-exported all 11 onboarding state classes (`CandidateListState`, `WorkflowStagesState`, `CandidateDetailsState`, `CtcInitiateState`, `MoveCandidateState`, `SendOfferLetterState`, `AddCandidateState`, `TriggerJoineeFormState`, `SendLoiState`, `AutoProgressState`, `BulkActionState`) and added them to `__all__`.

### Cleanup

- `[MEDIUM] [CLEANUP] requirements.txt:1-43` — All deps `>=` with no upper bound. `langgraph>=0.2.60` could install a major bump. Pin to known-good versions or use `pip-compile`/`uv` lockfile.
- `[MEDIUM] [CLEANUP] requirements.txt` — `sentence-transformers` (~500MB with torch) loaded at startup. If only RAG ingestion needs it, move to an extras group (`pip install ".[rag]"`).
- `[MEDIUM] [CLEANUP] hrms_agents/api/chat.py:75-293` — `_build_initial_state` is 220 lines of `if sub_flow == ...` branches. Drop into per-flow factories.
- `[LOW] [CLEANUP] docker-compose.yml` — `redis:7-alpine` doesn't ship `FT.*`; checkpointer silently falls back to `MemorySaver`. Use `redis/redis-stack-server:latest`.
- `[LOW] [CLEANUP] integrations/mcp_client.py:118-119` — `HTTPMCPClient` back-compat alias kept post-migration. Grep callers; remove if none.
- `[LOW] [CLEANUP] hrms_agents/states/{leave,duty}.py` — `awaiting_confirm` declared on TypedDict but never seeded. Seed or drop.
- `[LOW] [CLEANUP] hrms_agents/supervisor.py:520` — `classify_agent = classify_sub_flow` back-compat alias. Remove if no callers, or mark with deprecation.

### Improvements

- `[MEDIUM] [IMPROVEMENT] hrms_agents/api/_shared/deps.py` — Add a `get_authenticated_user` dependency. Centralises auth, eliminates the IDOR class with one change.
- `[MEDIUM] [IMPROVEMENT] hrms_agents/checkpointer.py` — Surface `MemorySaver` fallback at `/health` (`checkpointer_kind: "redis" | "memory"`) so deploys catch the misconfig before users lose state.
- `[LOW] [IMPROVEMENT] hrms_agents/api/chat.py:451` — Wrap `gen()` body in an outer try/except so a synchronous error in `_build_initial_state` surfaces as a clean SSE `error` event instead of a pre-stream 500.
- `[LOW] [IMPROVEMENT] integrations/mcp_client.py:91` — `except Exception` collapses every tool error to one shape. Distinguish timeout / validation / upstream so agent retry logic can branch.
- `[LOW] [IMPROVEMENT] hrms_agents/main.py:48-70` — Index creation runs on every worker boot. Wrap with a once-per-deploy guard (env flag or Redis lock).

---

## Frontend — `zimyo_ai_frontend/`

### Security

- `[HIGH] [SECURITY] zimyo_ai_frontend/.env:2-3` — Live Deepgram + ElevenLabs API keys committed in earlier commits (`8cb40ff`, `a56c399`) before `.gitignore` was added. `git show 8cb40ff:zimyo_ai_frontend/.env` returns full secrets. Rotate, BFG/`git filter-repo` to scrub, force-push, re-issue from a secret manager. ElevenLabs key isn't even referenced in code (`grep -rn "ELEVENLABS"` empty) — drop entirely.
- `[HIGH] [SECURITY] src/hooks/useDeepgramSTT.jsx:19,75` — Deepgram API key shipped to every browser. `import.meta.env.VITE_DEEPGRAM_API_KEY` is inlined into the JS bundle and used to open a WebSocket directly with Deepgram. Anyone with DevTools can lift it. Move STT to a backend proxy or use Deepgram short-lived temporary tokens.
- `[HIGH] [SECURITY] src/App.jsx:10-21` — Auth credentials in `localStorage` with no expiry. `zimyo_user` (containing `userToken` flow context) sits indefinitely. XSS in any dependency reads it. Move sensitive bits to httpOnly cookie issued by backend; keep only display fields client-side.
- `[MEDIUM] [SECURITY] src/components/messages/_RichTextEditor.jsx:108,119` — `window.prompt` URL inserted as raw HTML. Fallback path does `insertContent(\`<a href="${url}">${url}</a>\`)`. `javascript:alert(1)` or `" onerror=...` lands unsanitised, then ships to backend as offer-letter HTML. Sanitise with DOMPurify; restrict to `http(s):` schemes.
- `[MEDIUM] [SECURITY] src/components/messages/PdfPreview.jsx:73-79` — Backend-controlled URL embedded in `<iframe>` with no allowlist. Add a host allowlist (Zimyo storage only) and `sandbox` attr.
- `[LOW] [SECURITY] index.html:1-16` — No CSP, no `X-Content-Type-Options`. Add a strict CSP (`default-src 'self'; connect-src 'self' https://api.deepgram.com wss://api.deepgram.com <api host>; font-src 'self' https://fonts.gstatic.com; ...`).

### Bugs

- ✅ `[HIGH] [BUG] src/components/Toast.jsx:19,25` — Early return now lives below `useEffect`; the effect no-ops when `toast` is null.
- ✅ `[HIGH] [BUG] src/pages/Chat.jsx:140-150` — `messages.length` removed from workflow-fetch deps; effect refires only on `agentType`/`userId` change.
- ✅ `[HIGH] [BUG] src/pages/Chat.jsx:232-378` — `sendAbortRef` holds an `AbortController`; aborts on unmount and on next send; `signal` passed to `sendMessageStream`; `AbortError` no longer surfaces as a user-visible error.
- ✅ `[MEDIUM] [BUG] src/pages/Chat.jsx:130-138` — Dropped `initialized.current` ref guard; `loadSessions` now keyed on `[user?.userId, agentType]`.
- ✅ `[MEDIUM] [BUG] src/pages/Chat.jsx:265` — All four message ids (`user`, `stream`, `bot`, `err`) now use `crypto.randomUUID()` (with a Date.now+random fallback for older WebViews).
- ✅ `[MEDIUM] [BUG] src/pages/Chat.jsx:65-79` — Already gated to `role === 'user'` at the call sites (history replay line 235, user-typed text line 271); added a clarifying comment so the intent is explicit.
- ✅ `[MEDIUM] [BUG] src/components/MessageRenderer.jsx:88-89` — Added an `UnknownType` dev banner + a deduped `console.warn` so a missing renderer is impossible to miss in dev.
- ✅ `[MEDIUM] [BUG] src/components/messages/Form.jsx:33-45` — `MessageRenderer` now passes a fields-shape signature as `key` for `form`/`wizard` types, forcing a remount when the `ui_partial` → `final` transition replaces the field set with new defaults.
- ✅ `[MEDIUM] [BUG] src/components/messages/DataTable.jsx:34` — `formatCell` now guards `typeof value === 'string'` before `.includes('-')`.
- ✅ `[MEDIUM] [BUG] src/components/ChatMessage.jsx:156-167` — `key={res.id || res.url || res.name || i}` on the resources map.
- ✅ `[LOW] [BUG] src/components/Sidebar.jsx:86` — Replaced `Math.random()` fallback with `idx-${index}-${name}`.
- ✅ `[LOW] [BUG] src/hooks/useDeepgramSTT.jsx:139` — Empty-deps unmount cleanup with a ref-to-latest (`cleanupRef`); robust to a future refactor that adds dependencies.

### Architecture

- `[HIGH] [ARCHITECTURE] src/components/ChatInput.jsx` — FE ignores backend `input_mode`, breaking the voice 2-phase ack contract. `Chat.jsx` never reads `result.input_mode`; voice-initiated flows render text-only follow-ups instead of voice-shaped acks. Wire `input_mode` from `onFinal` into `Chat` state and pass to `ChatInput`.
- `[MEDIUM] [ARCHITECTURE] src/components/ActionButtons.jsx` — Hindi/Hinglish regex tables hardcoded in the FE. Patterns like `/कौनसा हाफ|kya karna|कब से|kab se|वजह|wajah/` plus colored option lists encode HR-domain prompt knowledge in the FE — feature-specific keyword table that the project rule forbids. Move all of it to backend `chips` payloads (`type: "chips"`).
- `[MEDIUM] [ARCHITECTURE] src/pages/Chat.jsx:262` — Hindi/Hinglish UI string hardcoded ("Samajh raha hoon…"). Project rule: hardcoded strings default to English. Replace with English equivalent or pull from `phaseLabel`.
- `[MEDIUM] [ARCHITECTURE] src/components/ChatMessage.jsx:46` — Voice TTS hardcoded to `lang = 'hi-IN'` regardless of message language. Either omit `lang` or detect script (roman → `'en-IN'`, devanagari → `'hi-IN'`). Better: have backend signal language with the message.
- `[MEDIUM] [ARCHITECTURE] src/pages/Chat.jsx:81-106` — `AGENT_CONFIG` duplicated between `Chat.jsx` and `AgentSelect.jsx` with subtly different shapes. Lift to `src/config/agents.js`.
- `[LOW] [ARCHITECTURE] src/hooks/useDeepgramSTT.jsx` — STT hook talks to a third-party directly; everything else goes through `src/api/client.js`. Adding `streamMicAudio({signal, onTranscript})` to `client.js` (calling your backend) fixes architecture and security at once.

### Performance

- `[MEDIUM] [PERF] package.json:19` — `react-markdown` declared but never imported. ~25KB gzipped of dead deps. Remove.
- `[MEDIUM] [PERF] src/api/client.js:51-95` — TextDecoder buffer can grow unbounded if backend never sends `\n\n`. Cap at 1MB and warn/close.
- `[LOW] [PERF] src/pages/Chat.jsx:131` — `scrollIntoView({ behavior: 'smooth' })` fires on every keystroke during streaming. Throttle to `requestAnimationFrame` or use `'auto'` during streaming, `'smooth'` only on user message append.
- `[LOW] [PERF] src/components/messages/DataTable.jsx` — No virtualisation; `max-h-[400px]` only clips visually. Add `react-window` for tables >100 rows when payroll dumps grow.

### A11y

- `[MEDIUM] [A11Y] src/components/ChatInput.jsx:94-119` — Mic and Send icon-only buttons missing `aria-label`. Only `title` (mouse-hover); screen readers announce nothing. Same on `Sidebar.jsx` collapse/logout and `Chat.jsx` header buttons.
- `[MEDIUM] [A11Y] src/components/messages/Approval.jsx:217-235 + Split.jsx:153-167` — Modal dialog with no focus trap, no `role="dialog"`, no Escape-to-close. Use a Dialog primitive (Radix) or implement focus trap + Escape handler + focus restore.
- `[LOW] [A11Y] src/components/messages/Form.jsx:266-280 + Wizard.jsx:214-221` — Toggle is a `<div onClick>` not a `<button>`. Keyboard users can't tab. Use `<button type="button" role="switch" aria-checked={value}>` (Settings.jsx already does this; copy that pattern).

### Cleanup

- `[LOW] [CLEANUP] src/pages/Chat.jsx:204` — Stray `console.error`. Route to Toast or delete.
- `[LOW] [CLEANUP] src/components/Sidebar.jsx:1` — `creating` state is set true then immediately false; spinner state buys nothing. Either remove or make it actually reflect the async create.
- `[LOW] [CLEANUP] src/pages/Settings.jsx (599 lines)` — Three sections (workflow / CTC / offer letter) mixed. Extract `<WorkflowSection>`, `<CtcSection>`, `<OfferLetterSection>` and a shared `useDefaults` hook.
- `[LOW] [CLEANUP] src/components/messages/Form.jsx + Wizard.jsx` — `FieldRenderer`/`FieldInput` duplicated. Extract a single `messages/_FieldRenderer.jsx`. Cuts ~150 lines and fixes drift (Form supports `tags`/`slider`/`daterange`, Wizard doesn't).
- `[LOW] [CLEANUP] src/vite.config.js:8-14` — Dev proxy at `/api` exists but no fetch in `client.js` uses it. Either drop or switch the client to relative `/api/...` URLs in dev.
- `[LOW] [CLEANUP] zimyo_ai_frontend/Screenshot 2026-04-14 at 1.16.42 PM.png` (311KB) — Committed at project root. Move to `docs/` or add `*.png` to `.gitignore`.

### Improvements

- `[MEDIUM] [IMPROVEMENT] src/api/client.js` — No retry, no timeout, no auth header. Add `AbortSignal.timeout(30_000)` and a typed `ApiError` with `code`/`status`.
- `[MEDIUM] [IMPROVEMENT] src/pages/Chat.jsx` — `handleSend` is 160 lines mixing session creation, optimistic append, SSE callbacks, error fallback, final merge. Extract a `useChatStream({userId, sessionId})` hook returning `{messages, send, abort, loading, phaseLabel}`. Page becomes layout; logic becomes testable.
- `[LOW] [IMPROVEMENT] src/components/messages/` (21 files in one dir) — Group into `data/` (Card, DataTable, Stats, Dashboard, Empty), `input/` (Form, Wizard, Chips, Editor, _RichTextEditor), `flow/` (Approval, Checklist, Split, Confirmation, ChatHandoff), `chart/` (BarChart, LineChart, PieChart), `status/` (Loading, SuccessBanner, ErrorCard, TracePanel, PdfPreview).

---

## Cross-cutting themes

These patterns showed up across both repos and are worth fixing as a class:

1. **Secrets in repos.** Both `.env` files are tracked; backend also has live Zimyo creds as code defaults in `config.py`. Fix once with: rotate → `git rm --cached` → history scrub → pre-commit hook → `dotenv-linter` in CI.
2. **Five flavours of "parse JSON from a noisy LLM response."** `services/ai/structured.py` already solved this; four other modules re-implement variants. Migrate them all to `extract_structured`.
3. **Layer hygiene drift in both directions.** `services/ai/planner/` reaches up into `hrms_agents/agents/onboarding/`, and `integrations/`/`agents/` reach up into `hrms_agents/api/_trace`. `scripts/check_layers.py` exists — wire it into CI.
4. **Keyword tables masquerading as routing.** `services/ai/prompts/**` (backend) and `src/components/ActionButtons.jsx` (frontend) both contain hardcoded keyword/phrase tables in violation of the LLM-first rule. Delete both; backend should drive choices via `type: "chips"`.
5. **IDOR + permissive CORS + secrets-in-bundle.** Three independent auth issues that together let an attacker read another admin's full chat history. Fix the auth dependency once and the surface shrinks dramatically.
6. **Bedrock provider switch is half-wired.** `chat.py` got the three direct call sites, but `structured.py` wasn't updated; planner/python_engine still use hand-rolled JSON parsing. Tracking this as one work item: "complete Bedrock support across the structured-output path."

---

## What was NOT reviewed

- Test files (`tests/`) — only the production surface was scoped.
- Generated artefacts (`venv/`, `node_modules/`, `dist/`, `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`).
- Log files (`server.log`, `uvicorn.log`) — flagged that they're tracked, not their contents.
- `services/analytics/` and `services/ai/python_engine/python_engine.py` internals beyond the public surface.
- Zimyo MCP server (`zimyo_api_server/`) — not listed in the scope.
