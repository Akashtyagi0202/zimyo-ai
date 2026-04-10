# Frontend Instructions — Zimyo HR Onboarding Agent Chat UI

## Overview
Admin ek chat window mein type karega. Agent respond karega — kabhi chips dikhayega (Overtime, Bonus choose karne ke liye), kabhi CTC card dikhayega (portal jaisa), kabhi success banner. Sab kuch **React components** mein banta hai. Backend sirf JSON bhejta hai.

---

## Tech Stack

| Tool | Version | Kaam |
|------|---------|------|
| React | 18+ | UI framework |
| Vite | 5+ | Build tool (fast setup) |
| Tailwind CSS | 3+ | Styling |
| Axios | 1+ | Backend se API calls |
| socket.io-client | 4+ | Real-time streaming (agent typing) |

---

## Project Setup

```bash
# Step 1 — Project create karo
npm create vite@latest zimyo-agent-chat -- --template react
cd zimyo-agent-chat

# Step 2 — Dependencies install karo
npm install
npm install axios socket.io-client
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### tailwind.config.js
```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

### index.css (top pe add karo)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Folder Structure

```
src/
├── components/
│   ├── ChatWindow.jsx        ← main chat container
│   ├── MessageRenderer.jsx   ← type dekho, sahi component render karo
│   ├── messages/
│   │   ├── TextBubble.jsx        ← normal text message
│   │   ├── SelectionMessage.jsx  ← chips (overtime/bonus choose karne ke liye)
│   │   ├── MonthPicker.jsx       ← applicable from chips
│   │   ├── ToggleMessage.jsx     ← ESIC/LWF/PT toggles
│   │   ├── CTCCard.jsx           ← portal-style CTC breakdown card
│   │   └── SuccessBanner.jsx     ← acknowledge success
├── hooks/
│   └── useAgentChat.js       ← backend se baat karne ka logic
├── App.jsx
└── main.jsx
```

---

## Backend se aane wala JSON format

Backend ye JSON messages bhejega. Frontend ko sirf `type` dekh ke sahi component render karna hai.

### 1. Normal text message
```json
{
  "type": "text",
  "role": "agent",
  "content": "Namaste! Kya karna hai?"
}
```

### 2. Selection (Overtime / Bonus dropdown)
```json
{
  "type": "ask_selection",
  "message": "Overtime Plan choose karo",
  "field": "overtime_plan",
  "options": [
    { "id": 0, "name": "NONE" },
    { "id": 3, "name": "Night Shift Plan" },
    { "id": 7, "name": "Weekend OT" }
  ]
}
```

### 3. Month picker
```json
{
  "type": "ask_month",
  "message": "Applicable From select karo",
  "field": "applicable_from"
}
```

### 4. Toggles
```json
{
  "type": "ask_toggles",
  "message": "Toggles set karo (default sab off hain)",
  "fields": [
    { "key": "enforce_esic",  "label": "Show Enforce ESIC",  "default": false },
    { "key": "esic_disabled", "label": "ESIC Disabled",       "default": false },
    { "key": "lwf_disabled",  "label": "LWF Disabled",        "default": false },
    { "key": "pt_disabled",   "label": "PT Disabled",         "default": false }
  ]
}
```

### 5. CTC result card
```json
{
  "type": "ctc_result",
  "candidate": {
    "name": "Deepak Singh",
    "structure": "test payroll(Gross)",
    "applicable_from": "Oct-2026",
    "overtime_name": "NONE",
    "bonus_name": "NONE"
  },
  "data": {
    "monthly_ctc": 418630,
    "monthly_gross": 416667,
    "monthly_deduction": 2008,
    "monthly_net": 414659,
    "basic": 125000,
    "hra": 0,
    "other": 291667,
    "pf": 1800,
    "esi": 0,
    "lwf": 20,
    "pt": 208
  }
}
```

### 6. Success / Acknowledge
```json
{
  "type": "success",
  "message": "CTC Acknowledged!",
  "next_stage": "Offer Letter"
}
```

---

## Components Code

### MessageRenderer.jsx
```jsx
import TextBubble from './messages/TextBubble'
import SelectionMessage from './messages/SelectionMessage'
import MonthPicker from './messages/MonthPicker'
import ToggleMessage from './messages/ToggleMessage'
import CTCCard from './messages/CTCCard'
import SuccessBanner from './messages/SuccessBanner'

export default function MessageRenderer({ msg, onUserAction }) {
  switch (msg.type) {
    case 'text':
      return <TextBubble msg={msg} />
    case 'ask_selection':
      return <SelectionMessage msg={msg} onSelect={onUserAction} />
    case 'ask_month':
      return <MonthPicker msg={msg} onSelect={onUserAction} />
    case 'ask_toggles':
      return <ToggleMessage msg={msg} onSubmit={onUserAction} />
    case 'ctc_result':
      return <CTCCard msg={msg} onAcknowledge={onUserAction} />
    case 'success':
      return <SuccessBanner msg={msg} />
    default:
      return <TextBubble msg={msg} />
  }
}
```

---

### SelectionMessage.jsx — Chips (Overtime / Bonus)
```jsx
export default function SelectionMessage({ msg, onSelect }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 max-w-sm">
      <p className="text-sm text-gray-700 mb-3">{msg.message}</p>
      <div className="flex flex-wrap gap-2">
        {msg.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onSelect({
              field: msg.field,
              value_name: opt.name,   // display ke liye
              value_id: opt.id        // backend ko bhejne ke liye
            })}
            className="px-3 py-1.5 text-xs border border-blue-400 text-blue-600
                       bg-blue-50 rounded-full hover:bg-blue-600 hover:text-white
                       transition-all cursor-pointer"
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

### ToggleMessage.jsx — ESIC / LWF / PT Toggles
```jsx
import { useState } from 'react'

export default function ToggleMessage({ msg, onSubmit }) {
  const initialState = {}
  msg.fields.forEach(f => { initialState[f.key] = f.default })
  const [values, setValues] = useState(initialState)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 max-w-sm">
      <p className="text-sm text-gray-700 mb-3">{msg.message}</p>
      <div className="flex flex-col gap-3 mb-4">
        {msg.fields.map(f => (
          <div key={f.key} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{f.label}</span>
            <div
              onClick={() => setValues(v => ({ ...v, [f.key]: !v[f.key] }))}
              className={`w-9 h-5 rounded-full cursor-pointer relative transition-colors
                ${values[f.key] ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                transition-all ${values[f.key] ? 'left-4' : 'left-0.5'}`} />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onSubmit({ field: 'toggles', values })}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
      >
        Confirm & Compute
      </button>
    </div>
  )
}
```

---

### CTCCard.jsx — Portal-style CTC Breakdown
```jsx
function fmt(n) { return Number(n).toLocaleString('en-IN') }

export default function CTCCard({ msg, onAcknowledge }) {
  const { candidate, data } = msg
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-lg">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5
                      flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-800">Joinee CTC — Computed</span>
        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
          {candidate.name} | {candidate.structure}
        </span>
      </div>

      {/* Summary 4 boxes */}
      <div className="grid grid-cols-2 border-b border-gray-200">
        {[
          { label: 'Monthly CTC',      val: data.monthly_ctc,       color: 'text-gray-900' },
          { label: 'Monthly Gross',    val: data.monthly_gross,     color: 'text-gray-900' },
          { label: 'Monthly Deduction',val: data.monthly_deduction, color: 'text-red-600'  },
          { label: 'Net Payable',      val: data.monthly_net,       color: 'text-green-700'},
        ].map((item, i) => (
          <div key={i} className={`p-3 ${i % 2 === 0 ? 'border-r' : ''} 
                                   ${i >= 2 ? 'border-t' : ''} border-gray-200`}>
            <div className="text-xs text-gray-500 mb-1">{item.label}</div>
            <div className={`text-base font-semibold ${item.color}`}>
              ₹{fmt(item.val)}
            </div>
          </div>
        ))}
      </div>

      {/* Earning + Deduction */}
      <div className="grid grid-cols-2">
        <div className="p-3 border-r border-gray-200">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Earning
          </div>
          {[['BASIC', data.basic], ['HRA', data.hra], ['Other', data.other]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs py-1
                                    border-b border-gray-100 last:border-0">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-800">₹{fmt(v)}</span>
            </div>
          ))}
        </div>
        <div className="p-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Deduction
          </div>
          {[['PF', data.pf], ['ESI', data.esi], ['LWF', data.lwf], ['PT', data.pt]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs py-1
                                    border-b border-gray-100 last:border-0">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-800">₹{fmt(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2.5 flex justify-between items-center">
        <span className="text-xs text-gray-400">
          From: {candidate.applicable_from} &nbsp;|&nbsp;
          OT: {candidate.overtime_name} &nbsp;|&nbsp;
          Bonus: {candidate.bonus_name}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onAcknowledge({ action: 'cancel' })}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-md
                       text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onAcknowledge({ action: 'acknowledge' })}
            className="px-4 py-1.5 text-xs bg-blue-600 text-white
                       rounded-md hover:bg-blue-700 font-medium"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### useAgentChat.js — Backend se baat karna
```js
import { useState, useCallback } from 'react'
import axios from 'axios'

const BASE_URL = 'http://localhost:8000'  // apna backend URL

export function useAgentChat() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID())

  // Message add karo (user ya agent)
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now() }])
  }, [])

  // Admin ka text message bhejo
  const sendMessage = useCallback(async (text) => {
    // User ka message turant dikhao
    addMessage({ type: 'text', role: 'user', content: text })
    setLoading(true)

    try {
      const res = await axios.post(`${BASE_URL}/chat`, {
        session_id: sessionId,
        message: text
      })
      // Agent ka response add karo
      addMessage({ ...res.data, role: 'agent' })
    } catch (err) {
      addMessage({ type: 'text', role: 'agent', content: 'Kuch error aaya, dobara try karo.' })
    } finally {
      setLoading(false)
    }
  }, [sessionId, addMessage])

  // Admin ne chip/toggle/button se kuch select kiya
  const sendAction = useCallback(async (action) => {
    // User ka selection dikhao
    addMessage({
      type: 'text',
      role: 'user',
      content: action.value_name || action.action || JSON.stringify(action.values)
    })
    setLoading(true)

    try {
      const res = await axios.post(`${BASE_URL}/action`, {
        session_id: sessionId,
        action               // { field, value_id, value_name } ya { action: 'acknowledge' }
      })
      addMessage({ ...res.data, role: 'agent' })
    } catch (err) {
      addMessage({ type: 'text', role: 'agent', content: 'Error aaya.' })
    } finally {
      setLoading(false)
    }
  }, [sessionId, addMessage])

  return { messages, loading, sendMessage, sendAction }
}
```

---

### ChatWindow.jsx — Main Component
```jsx
import { useRef, useEffect } from 'react'
import { useAgentChat } from '../hooks/useAgentChat'
import MessageRenderer from './MessageRenderer'

export default function ChatWindow() {
  const { messages, loading, sendMessage, sendAction } = useAgentChat()
  const inputRef = useRef()
  const bottomRef = useRef()

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = inputRef.current.value.trim()
    if (!text || loading) return
    inputRef.current.value = ''
    sendMessage(text)
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center
                        justify-center text-xs font-bold text-blue-700">Z</div>
        <div>
          <div className="text-sm font-semibold text-gray-800">Zimyo Onboarding Agent</div>
          <div className="text-xs text-green-600">● Online</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map(msg => (
          <div key={msg.id}
               className={`flex gap-2 items-end ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center
                             text-xs font-semibold flex-shrink-0
                             ${msg.role === 'user' ? 'bg-green-100 text-green-800'
                                                   : 'bg-blue-100 text-blue-800'}`}>
              {msg.role === 'user' ? 'AD' : 'Z'}
            </div>
            <MessageRenderer msg={msg} onUserAction={sendAction} />
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center
                            justify-center text-xs font-semibold text-blue-800">Z</div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i}
                       className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                       style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
        <input
          ref={inputRef}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder='Type "Compute CTC for Deepak Singh"...'
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm
                     bg-gray-50 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center
                     justify-center hover:bg-blue-700 disabled:opacity-40"
        >
          ↑
        </button>
      </div>
    </div>
  )
}
```

---

## Backend ke saath Connect karna

### `.env` file banao
```env
VITE_API_URL=http://localhost:8000
```

### `useAgentChat.js` mein use karo
```js
const BASE_URL = import.meta.env.VITE_API_URL
```

---

## Important Rules (yaad rakhna)

1. **Admin ko ID kabhi mat dikhao** — sirf `name` dikhao, `id` sirf backend ko bhejo
2. **Type check karo** — `MessageRenderer` mein sirf `msg.type` se decide karo kya render karna hai
3. **Session ID bhejo** — har request ke saath `session_id` bhejo taaki backend state track kare
4. **Loading state** — agent respond karne ke beech typing indicator dikhao
5. **onUserAction** — chips/toggles/buttons sab `sendAction()` ko call karte hain, `sendMessage()` ko nahi

---

## Run karo
```bash
npm run dev
# http://localhost:5173 pe khulega
```
