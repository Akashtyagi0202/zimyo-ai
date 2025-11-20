# Zimyo AI Assistant - Test Interface 🧪

Beautiful web-based testing interface for your Zimyo AI Assistant API with chat and session management.

---

## 🎯 Features

✅ **User Login** - Test login with different users and roles
✅ **Session Management** - Create and switch between multiple chat sessions
✅ **Real-time Chat** - Interactive chat interface with message history
✅ **Beautiful UI** - Modern, responsive design with gradient colors
✅ **Status Indicators** - Connection status and loading states
✅ **Error Handling** - Clear error messages and alerts

---

## 🚀 How to Use

### Step 1: Start the Application

```bash
cd "/Users/akashtyagi/Documents/code/zimyo ai/zimyo_ai_assistant"
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

**Or use the automated script:**
```bash
cd "/Users/akashtyagi/Documents/code/zimyo ai"
./start.sh
```

### Step 2: Open Test Interface

Open your browser and go to:
```
http://localhost:8080
```

You'll see the beautiful test interface! 🎨

---

## 📖 Using the Test Interface

### 1. Login

**Sidebar → User Login Section:**
- **User ID:** Enter employee ID (default: `emp123`)
- **Role:** Select `employee` or `manager`
- **User Token:** Enter token (default: `test123`)
- Click **Login** button

**Status Badge** will change to "Connected" ✅

### 2. Create Session (Optional)

**Sidebar → Sessions Section:**
- Click **+ New Session** button
- Enter session name (optional)
- Session will appear in the list

### 3. Select Session

**Sessions List:**
- Click on any session to activate it
- Active session will be highlighted in purple
- Chat will be associated with this session

### 4. Start Chatting

**Chat Area:**
- Type your message in the input box at the bottom
- Press **Enter** or click **➤** button to send
- AI response will appear in the chat

**Example Messages:**
- "What is my leave balance?"
- "Apply leave for tomorrow"
- "Mark my attendance"
- "What types of leaves are available?"
- "What is the company policy on sick leave?"

### 5. Test Multiple Sessions

- Create multiple sessions
- Switch between them to test session management
- Each session maintains its own conversation history

---

## 🎨 Interface Overview

### Layout

```
┌─────────────────────────────────────────────────────────┐
│              🤖 Zimyo AI Assistant                      │
│         Test Interface - Chat & Session Management      │
├──────────────┬──────────────────────────────────────────┤
│   Sidebar    │          Chat Area                       │
│              │                                           │
│  User Login  │  ┌────────────────────────────────────┐  │
│  ┌────────┐  │  │  Chat Header                       │  │
│  │User ID │  │  │  Status: Connected                 │  │
│  │Role    │  │  └────────────────────────────────────┘  │
│  │Token   │  │                                           │
│  └────────┘  │  ┌────────────────────────────────────┐  │
│  [Login]     │  │                                     │  │
│              │  │  Chat Messages                      │  │
│  Sessions    │  │                                     │  │
│  [+ New]     │  │  User: Hi                          │  │
│              │  │  AI: Hello! How can I help?        │  │
│  ┌────────┐  │  │                                     │  │
│  │Session1│  │  └────────────────────────────────────┘  │
│  │Session2│  │                                           │
│  └────────┘  │  ┌────────────────────────────────────┐  │
│              │  │  Type message...            [➤]   │  │
│              │  └────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────┘
```

### Color Scheme

- **Primary:** Purple gradient (#667eea → #764ba2)
- **Background:** Light gray (#f8f9fa)
- **User Messages:** Purple gradient
- **AI Messages:** White with shadow
- **Buttons:** Gradient with hover effects

---

## 🧪 Testing Scenarios

### Scenario 1: Employee Leave Request
1. Login as employee
2. Create new session named "Leave Test"
3. Chat: "What is my leave balance?"
4. Chat: "Apply casual leave for tomorrow"
5. Verify responses

### Scenario 2: Manager Operations
1. Login as manager (change role to `manager`)
2. Create session
3. Chat: "Draft an email for new employee onboarding"
4. Verify manager-specific responses

### Scenario 3: Multi-Session Testing
1. Login as employee
2. Create Session 1: "Leave Queries"
3. Create Session 2: "Attendance"
4. Switch between sessions
5. Chat different topics in each
6. Verify session isolation

### Scenario 4: Policy Queries
1. Login
2. Chat: "What is the company leave policy?"
3. Chat: "How many sick leaves can I take?"
4. Verify policy responses with references

---

## 🔍 API Endpoints Used

The test interface uses these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/login` | POST | User login with credentials |
| `/chat` | POST | Send message and get AI response |
| `/sessions/create` | POST | Create new chat session |
| `/sessions/{userId}` | GET | Get all user sessions |
| `/` | GET | Serve test interface |
| `/docs` | GET | Swagger API documentation |

---

## 📱 Responsive Design

The interface works on:
- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1200px)
- ✅ Mobile (< 768px)

On mobile:
- Sidebar stacks on top
- Chat area adjusts height
- Touch-friendly buttons

---

## 🐛 Troubleshooting

### Issue: Page won't load
**Solution:**
- Check if server is running: `http://localhost:8080/api`
- Check browser console for errors
- Verify `static/index.html` exists

### Issue: Login fails
**Solution:**
- Check Redis is running: `redis-cli ping`
- Check server logs for errors
- Verify user credentials in server

### Issue: Chat doesn't send
**Solution:**
- Check if logged in (status badge says "Connected")
- Check browser console for CORS errors
- Verify `/chat` endpoint is working: `http://localhost:8080/docs`

### Issue: Sessions not loading
**Solution:**
- Check if logged in successfully
- Verify `/sessions/{userId}` endpoint
- Check browser console for errors

---

## 🎯 Quick Test Commands

### Test with cURL (without interface):

**Login:**
```bash
curl -X POST "http://localhost:8080/login?userId=emp123&role=employee&userToken=test123"
```

**Chat:**
```bash
curl -X POST "http://localhost:8080/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"emp123","message":"What is my leave balance?"}'
```

**Create Session:**
```bash
curl -X POST "http://localhost:8080/sessions/create" \
  -H "Content-Type: application/json" \
  -d '{"userId":"emp123","sessionName":"Test Session"}'
```

**Get Sessions:**
```bash
curl "http://localhost:8080/sessions/emp123"
```

---

## 💡 Tips

1. **Always login first** before testing chat or sessions
2. **Use sessions** to organize different conversation topics
3. **Check status badge** to ensure you're connected
4. **Watch for loading indicator** when AI is processing
5. **Use browser dev tools** (F12) to see network requests
6. **Test different roles** (employee vs manager) for different responses

---

## 📊 Features Tested

| Feature | Status | Notes |
|---------|--------|-------|
| User Login | ✅ | Login with userId, role, token |
| Chat Messages | ✅ | Send/receive messages with AI |
| Session Creation | ✅ | Create named sessions |
| Session Switching | ✅ | Switch between multiple sessions |
| Message History | ✅ | View conversation in real-time |
| Error Handling | ✅ | Alerts for errors |
| Status Indicators | ✅ | Connection status, loading states |
| Responsive Design | ✅ | Works on all screen sizes |
| CORS Support | ✅ | Cross-origin requests enabled |

---

## 🚀 Next Steps

1. **Start the app:** `uvicorn app:app --host 0.0.0.0 --port 8080 --reload`
2. **Open browser:** `http://localhost:8080`
3. **Login with test credentials**
4. **Start testing!** 🎉

---

## 📸 Screenshots

### Main Interface
- Purple gradient header
- Sidebar with login and sessions
- Chat area with message bubbles
- Smooth animations

### Features Highlighted
- ✅ Beautiful gradient design
- ✅ Real-time chat interface
- ✅ Session management sidebar
- ✅ Status indicators
- ✅ Loading animations
- ✅ Error alerts
- ✅ Mobile responsive

---

## 🎨 Customization

Want to customize the interface? Edit:
```
static/index.html
```

**Change colors:**
- Line 14: Gradient background
- Line 87: Button colors
- Line 345: Message bubble colors

**Change API URL:**
- Line 336: `const API_BASE_URL = 'http://localhost:8080';`

---

**Happy Testing!** 🚀🎉

If you need any help, check:
- Swagger Docs: http://localhost:8080/docs
- This guide: `TEST_INTERFACE_GUIDE.md`
- Main guide: `HOW_TO_RUN.md`
