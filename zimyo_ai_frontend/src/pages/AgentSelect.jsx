import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  ArrowRight,
  Lock,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { AGENTS } from '../config/agents'

export default function AgentSelect({ user, onLogout }) {
  const navigate = useNavigate()

  const handleSelect = (agent) => {
    if (!agent.available) return
    navigate(agent.route)
  }

  const fullName = (user?.name || '').trim()
  const firstName = fullName ? fullName.split(/\s+/)[0] : ''
  const headerLabel = fullName || user?.userId || ''

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header — slim Craze-style chrome with brand left, user + actions right */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-600/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                Zimyo AI
              </h1>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">HR Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <Avatar className="h-8 w-8 rounded-lg bg-indigo-500">
                <AvatarFallback className="rounded-lg bg-indigo-500 text-white text-[11px] font-semibold uppercase">
                  {(headerLabel || 'U').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200 leading-tight">
                  {headerLabel}
                </p>
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 capitalize leading-tight">
                  {user?.designation ? `${user.designation} · ${user.role}` : user?.role}
                </p>
              </div>
            </div>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/settings')}
                    className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100"
                  >
                    <SettingsIcon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Settings</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onLogout}
                    className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Logout</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-14">
        {/* Welcome */}
        <div className="mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-5 shadow-sm">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            AI-powered HR assistant
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.15]">
            {firstName ? (
              <>
                Welcome back, <span className="gradient-text">{firstName}</span>
              </>
            ) : (
              <>
                Welcome to <span className="gradient-text">Zimyo AI</span>
              </>
            )}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-3 text-[14px] max-w-xl">
            Choose an assistant to get started. Each one is trained for a specific workflow.
          </p>
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {AGENTS.map((agent, index) => {
            const Icon = agent.icon
            return (
              <Card
                key={agent.id}
                onClick={() => handleSelect(agent)}
                className={cn(
                  'animate-stagger group relative overflow-hidden rounded-2xl p-6 transition-all duration-300',
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                  agent.available
                    ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 dark:hover:shadow-black/20 hover:border-slate-300 dark:hover:border-slate-700'
                    : 'opacity-60 cursor-not-allowed'
                )}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* gradient accent bar */}
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', agent.gradient, 'opacity-80')} />

                {!agent.available && (
                  <Badge variant="secondary" className="absolute top-4 right-4 gap-1 text-[10px] uppercase">
                    <Lock className="w-3 h-3" />
                    Soon
                  </Badge>
                )}

                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-5 shadow-md shadow-slate-900/10',
                    'bg-gradient-to-br',
                    agent.gradient
                  )}
                >
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.25} />
                </div>

                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {agent.title}
                  </h3>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{agent.subtitle}</span>
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                  {agent.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-5">
                  {agent.features.map((feat) => {
                    const FeatIcon = feat.icon
                    return (
                      <span
                        key={feat.label}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium',
                          agent.available
                            ? 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700/60'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                        )}
                      >
                        <FeatIcon className="w-3 h-3" />
                        {feat.label}
                      </span>
                    )
                  })}
                </div>

                {agent.available && (
                  <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
                      Open assistant
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-900 dark:group-hover:text-slate-100" />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
