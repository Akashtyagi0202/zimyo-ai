import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import { User, KeyRound, Shield, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ userId: '', role: 'employee', userToken: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login is fire-and-forget for policy ingestion: backend spawns the
  // background task; the chat-header chip on /chat/policy shows status.
  // No polling here — keeps the login path fast.
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await login({
        userId: form.userId,
        role: form.role,
        userToken: form.userToken,
        loadPolicies: true,
      })
      onLogin({
        userId: form.userId,
        role: form.role,
        name: res?.name || '',
        department: res?.department || '',
        designation: res?.designation || '',
      })
      navigate('/agents')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Soft accent blobs — subtle, no longer dominate the page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-violet-200/30 dark:bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in-scale">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-4 shadow-lg shadow-indigo-600/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Zimyo AI
          </h1>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">
            HR Assistant — smart, fast, conversational
          </p>
        </div>

        {/* Login card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 dark:shadow-black/30">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription className="text-[12.5px]">
              Use your Zimyo employee ID and auth token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-md text-rose-700 dark:text-rose-300 text-xs animate-slide-up">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Field label="Employee ID" icon={User}>
                <Input
                  type="text"
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  placeholder="e.g. ZIM1234"
                  required
                  className="pl-9 h-10"
                />
              </Field>

              <Field label="Role" icon={Shield}>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none cursor-pointer"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </Field>

              <Field label="Auth Token" icon={KeyRound}>
                <Input
                  type="password"
                  value={form.userToken}
                  onChange={(e) => setForm({ ...form, userToken: e.target.value })}
                  placeholder="Paste your token"
                  required
                  className="pl-9 h-10"
                />
              </Field>

              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full h-10 mt-2',
                  'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700',
                  'text-white shadow-md shadow-indigo-600/20'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Connecting…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 dark:text-slate-500 text-[10.5px] mt-5 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          Powered by Zimyo AI
        </p>
      </div>
    </div>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative group">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
        {children}
      </div>
    </div>
  )
}
