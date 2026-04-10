import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, getPolicyStatus } from '../api/client'
import { Bot, User, KeyRound, Shield, Loader2, CheckCircle2, FileText, AlertCircle, Sparkles } from 'lucide-react'

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ userId: '', role: 'employee', userToken: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [policyStatus, setPolicyStatus] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const pollPolicyStatus = (userId) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await getPolicyStatus(userId)
        setPolicyStatus(status)
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'skipped') {
          clearInterval(pollRef.current)
          if (status.status === 'completed' || status.status === 'skipped') {
            setTimeout(() => {
              onLogin({ userId, role: form.role })
              navigate('/agents')
            }, 800)
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 1500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setPolicyStatus(null)

    try {
      const result = await login({
        userId: form.userId,
        role: form.role,
        userToken: form.userToken,
        loadPolicies: false,
      })

      // Login success — skip policy polling, go straight to chat
      if (result.status === 'success' || result.message || result) {
        onLogin({ userId: form.userId, role: form.role })
        navigate('/agents')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zimyo-800 via-zimyo-700 to-blue-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zimyo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-scale">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="animate-float inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20 shadow-lg shadow-white/5">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Zimyo AI</h1>
          <p className="text-blue-200 mt-2 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            HR Assistant - Smart & Fast
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Policy Loading State */}
          {policyStatus && (
            <PolicyLoadingCard status={policyStatus} />
          )}

          {/* Login Form */}
          {!policyStatus && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-slide-up">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* User ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee ID</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-zimyo-500 transition-colors" />
                  <input
                    type="text"
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    placeholder="Enter your employee ID"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zimyo-500/20 focus:border-zimyo-500 outline-none transition-all text-sm bg-gray-50 hover:bg-white hover:border-gray-300"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <div className="relative group">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-zimyo-500 transition-colors" />
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zimyo-500/20 focus:border-zimyo-500 outline-none transition-all text-sm bg-gray-50 hover:bg-white hover:border-gray-300 appearance-none cursor-pointer"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              {/* Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Auth Token</label>
                <div className="relative group">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-zimyo-500 transition-colors" />
                  <input
                    type="password"
                    value={form.userToken}
                    onChange={(e) => setForm({ ...form, userToken: e.target.value })}
                    placeholder="Enter your auth token"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zimyo-500/20 focus:border-zimyo-500 outline-none transition-all text-sm bg-gray-50 hover:bg-white hover:border-gray-300"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-zimyo-600 to-indigo-600 hover:from-zimyo-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-zimyo-600/25 hover:shadow-xl hover:shadow-zimyo-600/30 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-blue-300/60 text-xs mt-6 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          Powered by Zimyo AI Assistant
        </p>
      </div>
    </div>
  )
}

function PolicyLoadingCard({ status }) {
  const isComplete = status.status === 'completed' || status.status === 'skipped'
  const isFailed = status.status === 'failed'
  const progress = status.total > 0 ? Math.round((status.processed / status.total) * 100) : 0

  return (
    <div className="space-y-4 py-2 animate-fade-in">
      <div className="flex items-center gap-3">
        {isComplete ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : isFailed ? (
          <AlertCircle className="w-6 h-6 text-red-500" />
        ) : (
          <Loader2 className="w-6 h-6 text-zimyo-600 animate-spin" />
        )}
        <div>
          <p className="font-semibold text-gray-900">
            {isComplete ? 'Ready!' : isFailed ? 'Error' : 'Setting up your session...'}
          </p>
          <p className="text-sm text-gray-500">
            {isComplete
              ? 'Policies loaded. Redirecting...'
              : isFailed
                ? 'Failed to load policies. Please retry.'
                : 'Loading company policies & data...'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {!isComplete && !isFailed && (
        <div className="space-y-2">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-zimyo-600 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progress, 10)}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FileText className="w-3 h-3" />
            <span>
              {status.processed}/{status.total || '...'} policies processed
            </span>
          </div>
        </div>
      )}

      {isComplete && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>{status.policies_count || 0} policies loaded successfully</span>
        </div>
      )}
    </div>
  )
}
