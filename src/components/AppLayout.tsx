import { NavLink, Outlet } from 'react-router'
import { LayoutDashboard, Target, UserRound, PlugZap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/baseline', label: 'Baseline Metrics', icon: UserRound },
  { to: '/goals', label: 'Goal Intake', icon: Target },
  { to: '/connectors', label: 'Connectors', icon: PlugZap },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r p-4 md:flex">
          <div className="mb-6 flex items-center gap-2 px-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">NutriSync</span>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-md border p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Spark-native runtime</p>
            <p className="mt-1">
              Skills, schedules and an MCP server ship in <code className="text-primary">/spark</code> and{' '}
              <code className="text-primary">/mcp-server</code> — Gemini Spark runs your nutrition
              loop on its cloud schedule, with Android voice logging both ways.
            </p>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
