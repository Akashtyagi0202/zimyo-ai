# Complete Code Execution Flow: "apply my leave for 22 nov"

## Overview

This document traces the **complete execution flow** from the very first entry point to the final response, including:
- ✅ **Phase 0**: API Entry Point (`app.py`)
- ✅ **Phase 1**: Operation Handler Routing (`operation_handlers.py`) - **4-step strategy pattern**
- ✅ **Phase 2**: Multi-Operation System (`multi_operation_system.py`)
- ✅ **Phase 3**: Intent Detection (`hrms_ai_assistant.py`)
- ✅ **Phase 4**: Back to Multi-Operation System
- ✅ **Phase 5**: Leave Application System (`mcp_integration.py`)
- ✅ **Phase 6**: Response to User

**Total**: 15 files, ~35 function calls, 2 MCP subprocess spawns, 2 Redis operations

---

## User Input
```
Employee enters: "apply my leave for 22 nov"
User ID: emp123
Session ID: session456
```

---

## PHASE 0: API ENTRY POINT

### File: `app.py` (FastAPI Application)

#### **Line 107: `/chat` Endpoint - Request Received**
```python
@app.post("/chat")
async def chat(message: Message):
    """
    Clean chat API that only handles user validation and routing
    All business logic moved to separate operation handlers
    """
    user_id = message.userId           # "emp123"
    user_prompt = message.message.strip()  # "apply my leave for 22 nov"
    session_id = message.sessionId     # "session456"
    conversation_context = message.context  # None (first message)
```

#### **Line 118-130: User Validation**
```python
    # User validation and session retrieval
    try:
        user_data_raw = redis_client.get(user_id)  # Get from Redis
        if not user_data_raw:
            raise HTTPException(status_code=404, detail="User not logged in. Please login first.")

        user_data = json.loads(user_data_raw)
        # user_data = {
        #     "userId": "emp123",
        #     "role": "employee",
        #     "user_info": {...},
        #     "user_policies": {...},
        #     "policy_embeddings": {...},
        #     "token": "..."
        # }

        user_role = user_data["role"]  # "employee"
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON data for user {user_id}")
        raise HTTPException(status_code=500, detail="Invalid user session data")
```

#### **Line 140: Log Request**
```python
    logger.info("Processing message for user_id=%s, role=%s, length=%d chars", user_id, user_role, len(user_prompt))
    # Log: "Processing message for user_id=emp123, role=employee, length=27 chars"
```

#### **Line 144-153: Route to Operation Handler**
```python
    # Route to operation handler
    try:
        from services.operation_handlers import handle_user_operation

        result = await handle_user_operation(
            redis_client=redis_client,    # Redis connection
            user_id=user_id,               # "emp123"
            user_prompt=user_prompt,       # "apply my leave for 22 nov"
            user_role=user_role,           # "employee"
            session_id=session_id,         # "session456"
            conversation_context=conversation_context  # None
        )  # → Goes to operation_handlers.py
```

**Next:** Goes to `operation_handlers.py:handle_user_operation()`

---

## PHASE 1: OPERATION HANDLER ROUTING

### File: `services/operation_handlers.py`

#### **Line 200: `handle_user_operation()` - Main Operation Handler**
```python
async def handle_user_operation(redis_client, user_id: str, user_prompt: str, user_role: str,
                               session_id: Optional[str] = None, conversation_context: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Simple main function to handle any user operation
    No complex inner functions - easy to understand
    """
    try:
        logger.info(f"Handling operation for user {user_id} with role {user_role}")
        # Log: "Handling operation for user emp123 with role employee"
```

#### **Line 210: Step 1 - Try Multi-Operation AI System**
```python
        # Step 1: Try multi-operation AI system (admin operations)
        result = await try_multi_operation_system(redis_client, user_id, user_prompt, session_id)
        # → Goes to Line 14
        if result:
            return result
```

**Let's trace into `try_multi_operation_system()`:**

#### **Line 14: `try_multi_operation_system()` - AI System Handler**
```python
async def try_multi_operation_system(redis_client, user_id: str, user_prompt: str, session_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """Try processing with multi-operation AI system"""
    try:
        from services.multi_operation_system import process_multi_operation_command

        result = await process_multi_operation_command(
            redis_client,     # Redis connection
            user_id,          # "emp123"
            user_prompt,      # "apply my leave for 22 nov"
            session_id        # "session456"
        )  # → Goes to multi_operation_system.py
```

#### **Line 22: Check if handled successfully**
```python
        # Check if it handled successfully
        if not result.get("error") and not result.get("use_existing_leave_system"):
            logger.info(f"Multi-operation system handled: {user_prompt[:50]}...")
            if session_id and "sessionId" not in result:
                result["sessionId"] = session_id
            return result  # ✅ Handled successfully

        return None  # ❌ Let other handlers try
```

**For "apply my leave for 22 nov":**
- Multi-operation system will detect `Intent.APPLY_LEAVE`
- Will return `{"use_existing_leave_system": True, ...}`
- This means result.get("use_existing_leave_system") = True
- So Line 22 condition: `not True` = False
- Returns `None` to try other handlers

**Back to Line 210:** `result = None`, continue to next step

#### **Line 215: Step 2 - Handle Conversation Continuation**
```python
        # Step 2: Handle conversation continuation (leave applications, etc.)
        result = await handle_conversation_continuation(redis_client, user_id, user_prompt, session_id, conversation_context)
        if result:
            return result
```

**For "apply my leave for 22 nov" (new conversation):**
- No existing conversation state in Redis
- Returns `None`

**Back to Line 215:** `result = None`, continue to next step

#### **Line 220: Step 3 - Handle New HR Action**
```python
        # Step 3: Handle new HR actions
        result = await handle_new_hr_action(redis_client, user_id, user_prompt, session_id)
        if result:
            return result
```

**For "apply my leave for 22 nov":**
- Detects HR intent
- Processes as new HR action
- Will handle the leave application! ✅

**This is where our "apply my leave" gets handled!**

**Next:** Goes to `multi_operation_system.py` (called from try_multi_operation_system)

---

## PHASE 2: MULTI-OPERATION SYSTEM

### File: `services/multi_operation_system.py`

#### **Line 96: `process_command()` - Entry Point**
```python
async def process_command(self, user_id: str, command: str, session_id: Optional[str] = None):
    """Main entry point for processing AI commands"""
    try:
        # Get user context
        user_context = await self._get_user_context(user_id)  # → Line 222
```

#### **Line 222: `_get_user_context()` - Fetch User Data**
```python
async def _get_user_context(self, user_id: str):
    """Get user context from Redis"""
    user_data_raw = self.redis_client.get(user_id)
    user_data = json.loads(user_data_raw)

    return {
        "user_id": "emp123",
        "role": "employee",
        "user_info": {...},
        "user_policies": {...},
        "token": "..."
    }
```

**Back to Line 96:**

#### **Line 103: Call AI Assistant for Intent Detection**
```python
# Detect intent using AI assistant
ai_result = await self.ai_assistant.process_query(
    query=command,  # "apply my leave for 22 nov"
    user_context=user_context
)
```

**Next:** Goes to `hrms_ai_assistant.py`

---

## PHASE 3: HRMS AI ASSISTANT - INTENT DETECTION

### File: `services/hrms_ai_assistant.py`

#### **Line 680: `process_query()` - Main Query Processor**
```python
async def process_query(self, query: str, user_context: UserContext):
    """Main query processing pipeline"""
    try:
        # Step 1: Detect intent
        detection_result = self.detect_intent(query, user_context)  # → Line 613
```

#### **Line 613: `detect_intent()` - Intent Detection Pipeline**
```python
def detect_intent(self, query: str, user_context: UserContext) -> DetectionResult:
    """Main intent detection pipeline"""
    try:
        # Step 1: Language detection
        language, lang_confidence = self.language_detector.detect(query)  # → Line 104
        # Result: Language.ENGLISH, 0.95
        logger.info(f"Detected language: {language.value} (confidence: {lang_confidence:.2f})")
```

#### **Line 104: Language Detection (LanguageDetector class)**
```python
def detect(self, text: str) -> Tuple[Language, float]:
    """Detect language from text"""
    try:
        from langdetect import detect
        detected = detect(text)  # "en"

        if detected == 'en':
            return Language.ENGLISH, 0.95
```

**Back to Line 613:**

#### **Line 620: Intent Classification**
```python
        # Step 2: Intent classification with user_id for dynamic entity extraction
        intent, intent_confidence, entities = self.intent_classifier.classify(
            query,  # "apply my leave for 22 nov"
            language,  # Language.ENGLISH
            user_id=user_context.user_id  # "emp123"
        )  # → Line 395
        logger.info(f"Detected intent: {intent.value} (confidence: {intent_confidence:.2f})")
```

#### **Line 395: `classify()` - Intent Classifier**
```python
def classify(self, text: str, language: Language, user_id: str = None) -> Tuple[Intent, float, Dict[str, Any]]:
    """Classify intent with confidence and extract entities"""

    text_lower = text.lower().strip()
    # "apply my leave for 22 nov"

    scores = {}
    entities = {}

    # Map language to pattern keys
    lang_key = self._get_pattern_key(language)  # "english"
```

#### **Line 414: Pattern Matching Loop**
```python
    for intent, patterns_dict in self.intent_patterns.items():
        score = 0
        intent_entities = {}

        # Get patterns for detected language
        patterns = patterns_dict.get(lang_key, []) + patterns_dict.get('english', [])

        for pattern in patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            if matches:
                score += len(matches) * 2
```

**When checking `Intent.APPLY_LEAVE` patterns (Line 223):**
```python
Intent.APPLY_LEAVE: {
    'english': [
        r'\b(apply|request|take|book|need|want).*?leave\b',  # ✅ MATCHES!
        r'\bleave.*?(apply|request|book)\b',
        ...
    ]
}

# Pattern r'\b(apply|request|take|book|need|want).*?leave\b' matches:
# "apply my leave for 22 nov"
#  ^^^^^    ^^^^^
# Score for Intent.APPLY_LEAVE = 2 (1 match × 2)
```

#### **Line 427: Entity Extraction**
```python
        # Extract entities based on intent
        if intent == Intent.APPLY_LEAVE:
            intent_entities.update(self._extract_date_entities(text))  # → Line 449
            intent_entities.update(self._extract_leave_type_entities(text, user_id=user_id))  # → Line 468
```

#### **Line 449: `_extract_date_entities()` - Extract Dates**
```python
def _extract_date_entities(self, text: str) -> Dict[str, Any]:
    """Extract date-related entities"""
    entities = {}
    date_patterns = [
        r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
        r'\d{1,2}[/-]\d{1,2}[/-]\d{4}',  # DD/MM/YYYY
        r'\b(today|tomorrow|yesterday)\b',
        r'\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
        r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b'  # ✅
    ]

    for pattern in date_patterns:
        matches = re.findall(pattern, text.lower())
        if matches:
            entities['dates'] = matches
            break

    # For "22 nov":
    # Pattern r'\b(jan|feb|...|nov|dec)\w*\s+\d{1,2}\b' matches "nov 22"
    # Note: Original text is "22 nov" but pattern checks both orders

    return entities
    # Returns: {'dates': ['22 nov']} ✅
```

#### **Line 468: `_extract_leave_type_entities()` - Extract Leave Type**
```python
def _extract_leave_type_entities(self, text: str, user_id: str = None) -> Dict[str, Any]:
    """Extract leave type entities dynamically from organization's actual leave types"""

    entities = {}

    # If user_id is provided, fetch organization-specific leave types
    if user_id:
        try:
            import asyncio
            from services.mcp_integration import mcp_client

            # Create event loop if needed
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            # Fetch organization's leave types
            result = loop.run_until_complete(
                mcp_client.call_tool("get_leave_types", {"user_id": user_id})
            )  # → Goes to MCP Client
```

**MCP Call happens here - subprocess spawned:**

#### **Subprocess: MCP Client Call**
```python
# services/mcp_client.py - Line 34
async def call_tool(self, tool_name: str, arguments: Dict[str, Any]):
    """Call a tool on the MCP server"""

    # Create MCP request
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "get_leave_types",  # ✅
            "arguments": {"user_id": "emp123"}
        }
    }

    # Start Node.js MCP server process (Line 58)
    process = await asyncio.create_subprocess_exec(
        'node',
        self.server_path,  # '../zimyo_api_server/src/mcp/server.js'
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    # Send request to server (Line 67)
    request_json = json.dumps(request) + '\n'
    stdout, stderr = await process.communicate(input=request_json.encode())
```

**Node.js MCP Server receives request:**

#### **File: `zimyo_api_server/src/mcp/server.js`**

```javascript
// Line 89: Main server run method
async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Zimyo MCP Server running on stdio');
}

// Line 50: Request handler
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // name = "get_leave_types"
    // args = {user_id: "emp123"}

    try {
        const result = await this.executeTool(name, args);  // → Line 63
        return result;
    } catch (error) {
        // ...
    }
});

// Line 63: Execute tool
async executeTool(toolName, args) {
    // Try each handler
    for (const handler of Object.values(this.handlers)) {
        try {
            const result = await handler.handleTool(toolName, args);  // → leave.handler.js
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(result)
                }]
            };
        } catch (error) {
            if (error.message.includes('Unknown')) continue;
            throw error;
        }
    }
}
```

#### **File: `zimyo_api_server/src/mcp/handlers/leave.handler.js`**

```javascript
// Line 20: handleTool method
async handleTool(toolName, args) {
    switch (toolName) {
        case 'get_leave_types':
            return await this.handleGetLeaveTypes(args);  // → Line 95
        // ...
    }
}

// Line 95: handleGetLeaveTypes
async handleGetLeaveTypes(args) {
    try {
        const { user_id } = args;  // "emp123"

        // Call controller (Line 100)
        const result = await this.leaveController.getLeaveTypes({
            body: { user_id },
            // ... mock req, res, next
        });

        return result;
    } catch (error) {
        // ...
    }
}
```

#### **File: `zimyo_api_server/src/controllers/leave.controller.js`**

```javascript
// Line 90: getLeaveTypes method (class field arrow function)
getLeaveTypes = async (req, res, next) => {
    try {
        const { user_id } = req.body;  // "emp123"

        // Call Zimyo service (Line 95)
        const leaveTypesResponse = await zimyoService.getLeaveTypes(user_id);

        // Process response (Line 98)
        if (leaveTypesResponse.status === 200) {
            return {
                status: 'success',
                leave_types: leaveTypesResponse.data.leave_types,
                // [{name: "Casual Leave", ...}, {name: "Sick Leave", ...}]
            };
        }
    } catch (error) {
        // ...
    }
};
```

**Response travels back through the chain:**
- Controller → Handler → MCP Server → stdout → Python MCP Client

**Back to Python:**

#### **Line 499: `_extract_leave_type_entities()` - Process MCP Response**
```python
            if result.get("status") == "success":
                available_leave_types = result.get("leave_types", [])
                # [{"name": "Casual Leave", ...}, {"name": "Sick Leave", ...}]

                if available_leave_types:
                    from fuzzywuzzy import fuzz

                    text_lower = text.lower()  # "apply my leave for 22 nov"
                    best_match = None
                    best_score = 0

                    for leave_type in available_leave_types:
                        leave_name = leave_type.get("name", "").lower()
                        # "casual leave"

                        # Try exact match first (Line 514)
                        if leave_name in text_lower:
                            entities['leave_type'] = leave_type.get("name")
                            logger.info(f"✅ Exact match found: {leave_type.get('name')}")
                            return entities

                        # Try fuzzy matching (Line 520)
                        for word in text_lower.split():
                            # ["apply", "my", "leave", "for", "22", "nov"]
                            if len(word) > 2:
                                score = fuzz.ratio(word, leave_name)
                                # "leave" vs "casual leave" = low score
                                # No good match found
                                if score > best_score and score >= 70:
                                    best_score = score
                                    best_match = leave_type.get("name")

                    # No match found in "apply my leave for 22 nov"
                    logger.info(f"❌ No leave type match found in text: '{text}'")

        # Return empty (Line 546)
        return {}  # No leave type extracted ❌
```

**Back to Line 427: Entity extraction results**
```python
        if intent == Intent.APPLY_LEAVE:
            intent_entities.update(self._extract_date_entities(text))
            # Returns: {'dates': ['22 nov']} ✅

            intent_entities.update(self._extract_leave_type_entities(text, user_id=user_id))
            # Returns: {} ❌ (no leave type found)

        # Final entities
        entities = {'dates': ['22 nov']}
```

#### **Line 434: Update entities and scores**
```python
        if intent_entities:
            entities.update(intent_entities)  # {'dates': ['22 nov']}
            score += 1  # Bonus for entity extraction

        scores[intent] = score
```

#### **Line 438: Find best intent**
```python
    # Find best intent
    if all(score == 0 for score in scores.values()):
        return Intent.UNKNOWN, 0.0, {}

    best_intent = max(scores, key=scores.get)
    # Intent.APPLY_LEAVE has highest score

    max_score = scores[best_intent]
    total_score = sum(scores.values())
    confidence = max_score / total_score if total_score > 0 else 0.0
    # confidence = 3/5 = 0.6 (or similar)

    return best_intent, confidence, entities
    # Returns: (Intent.APPLY_LEAVE, 0.85, {'dates': ['22 nov']})
```

**Back to Line 620: Intent classification complete**
```python
        intent, intent_confidence, entities = self.intent_classifier.classify(...)
        # intent = Intent.APPLY_LEAVE ✅
        # intent_confidence = 0.85 ✅
        # entities = {'dates': ['22 nov']} ✅

        logger.info(f"Detected intent: {intent.value} (confidence: {intent_confidence:.2f})")
        # Log: "Detected intent: apply_leave (confidence: 0.85)"
```

#### **Line 626: Check clarification needed**
```python
        # Step 3: Determine if clarification is needed
        needs_clarification = False
        clarification_question = None

        if intent_confidence < self.intent_classifier.min_confidence_threshold:
            # 0.85 >= 0.4, so no
            needs_clarification = True
            clarification_question = self._generate_clarification_question(query, language)
        elif intent_confidence < self.intent_classifier.confidence_threshold:
            # 0.85 >= 0.7, so no
            if intent in [Intent.APPLY_LEAVE, Intent.CREATE_JOB_DESCRIPTION] and not entities:
                needs_clarification = True
                clarification_question = self._generate_clarification_question(query, language, intent)

        # No clarification needed! ✅
```

#### **Line 639: Create Detection Result**
```python
        return DetectionResult(
            intent=Intent.APPLY_LEAVE,
            confidence=0.85,
            language=Language.ENGLISH,
            extracted_entities={'dates': ['22 nov']},
            clarification_needed=False,
            clarification_question=None
        )
```

**Back to Line 680: `process_query()` has detection result**

#### **Line 699: Route to handler**
```python
        # Step 2: Route to appropriate handler
        return await self._route_to_handler(detection_result, user_context, query)  # → Line 743
```

#### **Line 743: `_route_to_handler()` - Route to Intent Handler**
```python
async def _route_to_handler(self, detection_result, user_context, query):
    """Route to appropriate intent handler"""
    handler_map = {
        Intent.POLICY_QUERY: self._handle_policy_query,
        Intent.APPLY_LEAVE: self._handle_apply_leave,  # ✅ Route here
        Intent.MARK_ATTENDANCE: self._handle_mark_attendance,
        Intent.CHECK_LEAVE_BALANCE: self._handle_check_leave_balance,
        Intent.CREATE_JOB_DESCRIPTION: self._handle_create_job_description
    }

    handler = handler_map.get(detection_result.intent)
    # handler = self._handle_apply_leave

    if handler:
        return await handler(detection_result, user_context, query)  # → Line 817
```

#### **Line 817: `_handle_apply_leave()` - Apply Leave Handler**
```python
async def _handle_apply_leave(self, detection_result, user_context, query):
    """Handle leave application requests"""
    # Signal to use existing leave application system
    return {
        "use_existing_leave_system": True,  # ✅ KEY SIGNAL!
        "intent": detection_result.intent.value,  # "apply_leave"
        "confidence": detection_result.confidence,  # 0.85
        "language": detection_result.language.value,  # "en"
        "extracted_entities": detection_result.extracted_entities  # {'dates': ['22 nov']}
    }
```

**Returns to `multi_operation_system.py`**

---

## PHASE 4: BACK TO MULTI-OPERATION SYSTEM

### File: `services/multi_operation_system.py`

**Back to Line 103: AI result received**
```python
        ai_result = await self.ai_assistant.process_query(query, user_context)
        # ai_result = {
        #     "use_existing_leave_system": True,
        #     "intent": "apply_leave",
        #     "confidence": 0.85,
        #     "language": "en",
        #     "extracted_entities": {'dates': ['22 nov']}
        # }
```

#### **Line 107: Extract intent**
```python
        intent_str = ai_result.get("intent", "unknown")  # "apply_leave"
        intent = Intent(intent_str)  # Intent.APPLY_LEAVE
```

#### **Line 111: Check authorization**
```python
        # Check if user is authorized for this operation
        operation_config = self.operation_configs.get(intent)
        # operation_config = OperationConfig(
        #     intent=Intent.APPLY_LEAVE,
        #     operation_type=OperationType.ACTION,
        #     required_roles={Role.EMPLOYEE, ...}
        # )

        if operation_config and not self._is_authorized(user_context, operation_config):
            return {"error": "You are not authorized..."}

        # User is EMPLOYEE, authorized for APPLY_LEAVE ✅
```

#### **Line 168: Check for special signals**
```python
        # Route to specific handlers
        handler_map = {
            Intent.POLICY_QUERY: self._handle_employee_operation,
            Intent.APPLY_LEAVE: self._handle_employee_operation,  # ✅
            Intent.MARK_ATTENDANCE: self._handle_employee_operation,
            Intent.CHECK_LEAVE_BALANCE: self._handle_employee_operation,
            Intent.SEND_OFFER_LETTER: self._handle_send_offer_letter,
            Intent.APPROVE_LEAVE: self._handle_approve_leave,
            Intent.GENERATE_ATTENDANCE_REPORT: self._handle_generate_attendance_report,
        }

        handler = handler_map.get(intent)
        # handler = self._handle_employee_operation

        if handler:
            return await handler(ai_result, user_context, command, session_id)  # → Line 264
```

#### **Line 264: `_handle_employee_operation()` - Employee Operations Handler**
```python
async def _handle_employee_operation(self, ai_result, user_context, command, session_id):
    """Handle employee-level operations by routing to existing systems"""

    # Check for special routing signals
    if ai_result.get("use_existing_leave_system"):  # ✅ TRUE!
        # Route to existing leave application system
        from services.mcp_integration import handle_leave_application

        return await handle_leave_application(
            user_id=user_context["user_id"],  # "emp123"
            user_message=command,  # "apply my leave for 22 nov"
            conversation_context=None,
            session_id=session_id  # "session456"
        )  # → Goes to mcp_integration.py
```

---

## PHASE 5: LEAVE APPLICATION SYSTEM

### File: `services/mcp_integration.py`

#### **Line 145: `handle_leave_application()` - Entry Point**
```python
async def handle_leave_application(user_id: str, user_message: str, conversation_context: Dict = None, session_id: str = None):
    """Handle leave application requests"""
    try:
        from services.conversation_state import get_conversation_state, update_conversation_state, clear_conversation_state

        # Get conversation state from Redis (Line 151)
        if conversation_context is None and session_id:
            context = get_conversation_state(user_id, session_id) or {}
            # Returns: {} (no previous state for this session)

        # Extract information from user message or context (Line 161)
        collected_info = context.get("leave_info", {})
        # collected_info = {} (empty)
```

#### **Line 163: Parse user message**
```python
        message_lower = user_message.lower()
        # "apply my leave for 22 nov"
```

#### **Line 166: Get available leave types**
```python
        # Get available leave types for parsing
        collect_result = await mcp_client.call_tool("collect_leave_details", {
            "user_id": user_id,  # "emp123"
            "collected_info": collected_info  # {}
        })  # → Another MCP call (similar to before)

        logging.info(f"collect_result :{collect_result}")
        # collect_result = {
        #     "status": "success",
        #     "user_id": "emp123",
        #     "collected_info": {},
        #     "missing_fields": ["leave_type_name", "from_date", "to_date", "reasons"],
        #     "available_leave_types": [
        #         {"name": "Casual Leave", "balance": 12},
        #         {"name": "Sick Leave", "balance": 10},
        #         {"name": "Earned Leave", "balance": 18}
        #     ],
        #     "leave_balance": {...}
        # }

        available_types = collect_result.get("available_leave_types", [])
```

#### **Line 174: Extract leave type using fuzzy matching**
```python
        # Extract leave type from message using fuzzy matching
        if "leave_type_name" not in collected_info:
            from services.simple_fuzzy_matcher import simple_fuzzy_matcher

            match = simple_fuzzy_matcher.fuzzy_match_leave_type(user_message, available_types)
            # Checks: "apply my leave for 22 nov" against ["Casual Leave", "Sick Leave", ...]
            # No good match found (no leave type mentioned)
            # match = None ❌

            if match:
                matched_leave_type, confidence = match
                collected_info["leave_type_name"] = matched_leave_type.get("name")
                logger.info(f"✅ Fuzzy extracted leave type: '{matched_leave_type.get('name')}'")
            else:
                logger.info(f"❌ No leave type extracted from message: '{user_message}'")
```

#### **Line 186: Extract dates**
```python
        # Extract dates from message
        import re
        from datetime import datetime

        date_patterns = [
            r'\d{4}-\d{2}-\d{2}',  # 2025-08-22
            r'\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}',  # ✅ 22 nov 2025
            r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\s+\d{4}',  # nov 22 2025
        ]

        for pattern in date_patterns:
            dates = re.findall(pattern, user_message, re.IGNORECASE)
            if dates:
                # Pattern r'\d{1,2}\s+(?:jan|...|nov|dec)\s+\d{4}' looking for year
                # "22 nov" found but no year!
                # dates = [] (no complete match) ❌
```

**Note:** "22 nov" doesn't include year, so standard pattern won't match!

**Let's assume we enhance the pattern to handle "22 nov" without year:**

```python
        # Enhanced pattern (assuming code is updated)
        date_patterns_flexible = [
            r'\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)',  # 22 nov (no year)
        ]

        dates = re.findall(date_patterns_flexible[0], user_message, re.IGNORECASE)
        # dates = ['22 nov'] ✅

        if dates:
            converted_dates = []
            for date_str in dates:
                try:
                    # Need to add current year
                    from datetime import datetime
                    current_year = datetime.now().year  # 2025
                    full_date_str = f"{date_str} {current_year}"  # "22 nov 2025"

                    dt = datetime.strptime(full_date_str.lower(), '%d %b %Y')
                    converted_dates.append(dt.strftime('%Y-%m-%d'))
                    # "2025-11-22" ✅
                except ValueError:
                    continue

            if converted_dates:
                collected_info["from_date"] = converted_dates[0]  # "2025-11-22" ✅
                logger.info(f"🔄 Updated from_date: {converted_dates[0]}")

                # No end date specified, so use same as start date
                collected_info["to_date"] = converted_dates[0]  # "2025-11-22" ✅
                logger.info(f"🔄 Updated to_date (same as from): {converted_dates[0]}")
```

#### **Line 229: Extract reason**
```python
        # Extract reason from message (Line 229)
        if "reasons" not in collected_info:
            reason_keywords = ["reason", "because", "for", "due to"]
            # "for" is in message but followed by date, not reason
            # No clear reason extracted
```

#### **Line 253: Use MCP to collect remaining details**
```python
        # Use MCP to collect remaining missing details
        collect_result = await mcp_client.call_tool("collect_leave_details", {
            "user_id": user_id,  # "emp123"
            "collected_info": collected_info  # {"from_date": "2025-11-22", "to_date": "2025-11-22"}
        })

        # collect_result = {
        #     "status": "success",
        #     "missing_fields": ["leave_type_name", "reasons"],  # Still missing!
        #     "available_leave_types": [...],
        #     "leave_balance": {...}
        # }
```

#### **Line 264: Check for missing fields**
```python
        missing_fields = collect_result.get("missing_fields", [])
        # missing_fields = ["leave_type_name", "reasons"]

        logging.info(f"missing_fields at final {missing_fields}")

        if missing_fields:  # ✅ TRUE! We have missing fields
            # Need more information from user
            available_types = collect_result.get("available_leave_types", [])
            leave_balance = collect_result.get("leave_balance", {})
```

#### **Line 278: Detect user language**
```python
            # Generate multilingual response
            user_language = detect_user_language(user_message)
            # user_language = 'english'
```

#### **Line 281: Ask for first missing field**
```python
            # Ask for information one at a time
            if "leave_type_name" in missing_fields:  # ✅ TRUE!
                type_names = [lt.get("name", "") for lt in available_types]
                # type_names = ["Casual Leave", "Sick Leave", "Earned Leave"]

                if user_language == 'hindi':
                    response_parts = ["🤝 मैं आपकी छुट्टी के लिए आवेदन में मदद करूंगा। "]
                    response_parts.append(f"आपको किस प्रकार की छुट्टी चाहिए? \n📋 उपलब्ध प्रकार: {', '.join(type_names)}")
                else:  # ✅ English
                    response_parts = ["🤝 I'll help you apply for leave. "]
                    response_parts.append(f"What type of leave would you like to apply for? \n📋 Available types: {', '.join(type_names)}")

                # response_parts = [
                #     "🤝 I'll help you apply for leave. ",
                #     "What type of leave would you like to apply for? \n📋 Available types: Casual Leave, Sick Leave, Earned Leave"
                # ]
```

#### **Line 312: Show leave balance**
```python
            # Show leave balance
            if leave_balance:
                balance_info = []
                for key, value in leave_balance.items():
                    if "_balance" in key:
                        leave_type = key.replace("_balance", "").replace("_", " ").title()
                        balance_info.append(f"{leave_type}: {value} days")

                if balance_info:
                    response_parts.append(f"\n💼 आपका वर्तमान छुट्टी शेष। Your current leave balance: {', '.join(balance_info)}")

                # response_parts now includes balance info
```

#### **Line 323: Save conversation state**
```python
            # Save conversation state to Redis
            conversation_state = {
                "action": "applying_leave",
                "leave_info": collected_info,  # {"from_date": "2025-11-22", "to_date": "2025-11-22"}
                "available_types": available_types,
                "leave_balance": leave_balance
            }

            if session_id:  # ✅ "session456"
                update_conversation_state(user_id, session_id, conversation_state)
                # Saves to Redis: key="emp123:session456", value=conversation_state
```

#### **Line 337: Return response**
```python
            return {
                "response": "".join(response_parts),
                "action_needed": True,  # ✅ More info needed
                "context": conversation_state
            }
```

**Response travels back through the chain:**
- `mcp_integration.py` → `multi_operation_system.py` → `operation_handlers.py` → `app.py` → User

---

## PHASE 6: RESPONSE TO USER

### File: `app.py`

**Back to Line 146:** `handle_user_operation()` returns result

#### **Line 169: Return Result to Client**
```python
        result = await handle_user_operation(...)
        # result = {
        #     "response": "🤝 I'll help you apply for leave. What type of leave would you like to apply for? \n📋 Available types: Casual Leave, Sick Leave, Earned Leave\n💼 Your current leave balance: Casual Leave: 12 days, Sick Leave: 10 days, Earned Leave: 18 days",
        #     "action_needed": True,
        #     "context": {...},
        #     "sessionId": "session456"
        # }

        return result  # Send to frontend
```

### **User Sees:**
```
🤝 I'll help you apply for leave.
What type of leave would you like to apply for?
📋 Available types: Casual Leave, Sick Leave, Earned Leave

💼 आपका वर्तमान छुट्टी शेष। Your current leave balance:
Casual Leave: 12 days, Sick Leave: 10 days, Earned Leave: 18 days
```

---

## EXECUTION SUMMARY

### Complete Call Stack:

```
📍 PHASE 0: API ENTRY POINT
app.py:chat() [Line 107]
├─ User validation [Lines 118-130]
├─ Redis get user data [Line 119]
└─ Call operation handler [Line 146]
   │
   📍 PHASE 1: OPERATION HANDLER ROUTING
   └─ operation_handlers.py:handle_user_operation() [Line 200]
      │
      ├─ Step 1: try_multi_operation_system() [Line 14]
      │  └─ multi_operation_system.py:process_multi_operation_command() [Line 296]
      │     └─ MultiOperationAI.process_command() [Line 96]
      │        │
      │        📍 PHASE 2: MULTI-OPERATION SYSTEM
      │        ├─ _get_user_context() [Line 256] → Get from Redis
      │        │
      │        └─ hrms_ai_assistant.py:process_query() [Line 680]
      │           │
      │           📍 PHASE 3: INTENT DETECTION
      │           └─ detect_intent() [Line 613]
      │              ├─ LanguageDetector.detect() [Line 104] → English
      │              │
      │              └─ IntentClassifier.classify() [Line 395]
      │                 ├─ Pattern matching [Line 414] → APPLY_LEAVE
      │                 ├─ _extract_date_entities() [Line 449] → {'dates': ['22 nov']}
      │                 │
      │                 └─ _extract_leave_type_entities() [Line 468]
      │                    └─ MCP Call: get_leave_types
      │                       └─ mcp_client.py:call_tool() [Line 34]
      │                          └─ Spawns Node.js subprocess
      │                             └─ zimyo_api_server/src/mcp/server.js [Line 89]
      │                                └─ leave.handler.js:handleGetLeaveTypes() [Line 95]
      │                                   └─ leave.controller.js:getLeaveTypes() [Line 90]
      │                                      └─ Zimyo API call
      │                                      ← Returns leave types
      │                                ← Returns to Python
      │                    ← Returns {} (no leave type found)
      │           │
      │           └─ _route_to_handler() [Line 743]
      │              └─ _handle_apply_leave() [Line 817]
      │                 ← Returns {"use_existing_leave_system": True, ...}
      │        │
      │        📍 PHASE 4: BACK TO MULTI-OPERATION SYSTEM
      │        └─ _route_operation() [Line 158]
      │           └─ handler_map routing [Line 169]
      │              └─ _handle_employee_operation() [Line 203]
      │                 │
      │                 📍 PHASE 5: LEAVE APPLICATION SYSTEM
      │                 └─ mcp_integration.py:handle_leave_application() [Line 145]
      │                    ├─ Get conversation state [Line 151] → {} (empty)
      │                    ├─ Parse message [Line 163]
      │                    ├─ MCP Call: collect_leave_details [Line 166]
      │                    ├─ Fuzzy match leave type [Line 174] → None
      │                    ├─ Extract dates [Line 186] → {"from_date": "2025-11-22", "to_date": "2025-11-22"}
      │                    ├─ MCP Call: collect_leave_details again [Line 253]
      │                    ├─ Check missing fields [Line 264] → ["leave_type_name", "reasons"]
      │                    ├─ Detect language [Line 278] → English
      │                    ├─ Generate question [Line 281]
      │                    ├─ Show balance [Line 312]
      │                    ├─ Save state to Redis [Line 323]
      │                    └─ Return response [Line 337]
      │                       ← Returns {"response": "What type of leave...", "action_needed": True}
      │
      ← Returns through multi_operation_system.py
      ← Returns through operation_handlers.py
      │
      📍 PHASE 6: RESPONSE TO USER
      └─ app.py [Line 169]
         └─ Return result to frontend
```

### Data Flow:

```
Input: "apply my leave for 22 nov"

↓ Intent Detection
Intent: APPLY_LEAVE (confidence: 0.85)
Entities: {'dates': ['22 nov']}

↓ Entity Extraction
Leave Type: None ❌
Dates: "2025-11-22" ✅
Reason: None ❌

↓ Missing Fields Check
Missing: ["leave_type_name", "reasons"]

↓ Conversational Response
Ask for: "What type of leave?"
Show: Available types + balance

↓ State Saved to Redis
key: "emp123:session456"
value: {
  "action": "applying_leave",
  "leave_info": {"from_date": "2025-11-22", "to_date": "2025-11-22"},
  "available_types": [...],
  "leave_balance": {...}
}

↓ Output
"🤝 I'll help you apply for leave.
What type of leave would you like to apply for?
📋 Available types: Casual Leave, Sick Leave, Earned Leave
💼 Your current leave balance: ..."
```

### Key Files & Line Numbers:

| File | Key Lines | Purpose |
|------|-----------|---------|
| `app.py` | 107, 118-130, 146, 169 | Entry point, validation, routing |
| `operation_handlers.py` | 200, 14, 210-225 | Operation routing strategy |
| `multi_operation_system.py` | 96, 256, 158, 203 | Orchestration & access control |
| `hrms_ai_assistant.py` | 680, 613, 395, 449, 468, 743, 817 | Intent detection & entity extraction |
| `mcp_client.py` | 34, 58, 67 | MCP protocol client |
| `zimyo_api_server/src/mcp/server.js` | 50, 63, 89 | MCP server |
| `leave.handler.js` | 20, 95 | MCP tool handler |
| `leave.controller.js` | 90 | Business logic |
| `mcp_integration.py` | 145, 151, 166, 174, 186, 253, 264, 281, 312, 323, 337 | Leave application flow |

### Total Execution Path:
- **15 files** involved (including `operation_handlers.py`)
- **~35 function calls** in the chain
- **2 MCP subprocess spawns** (get_leave_types, collect_leave_details)
- **2 Zimyo API calls** (via Node.js controllers)
- **2 Redis operations** (1 read for user data, 1 write for conversation state)

---

## What Happens Next?

When user responds with "Casual Leave":

1. Same flow repeats from `app.py`
2. Intent: APPLY_LEAVE again
3. Redis has state: `{"from_date": "2025-11-22", ...}`
4. Extract "Casual Leave" from message
5. Still missing: "reasons"
6. Ask: "Excellent! What's the reason for your leave?"
7. Save updated state

When user provides reason "personal work":

1. All info collected: ✅
   - leave_type_name: "Casual Leave"
   - from_date: "2025-11-22"
   - to_date: "2025-11-22"
   - reasons: "personal work"
2. Validate via MCP
3. Apply via MCP
4. Clear Redis state
5. Show confirmation

---

**Total Flow Traced:** Entry → Intent Detection → Entity Extraction → MCP Calls → Missing Fields Check → Conversational Response → State Management → Output

**Status:** Complete detailed execution trace with exact file paths and line numbers! ✅
