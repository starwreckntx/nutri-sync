import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { useAppState, addWater, upsertWeights, removeMeal } from '@/lib/store'
import { lastNDays, macroTargets, todayKey } from '@/lib/metrics'
import { uid } from '@/lib/metrics'
import MealDialog from '@/components/MealDialog'
import CoachPanel from '@/components/CoachPanel'
import { Droplets, Scale, Flame, Beef, ArrowRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router'

export default function Dashboard() {
  const profile = useAppState((s) => s.profile)
  const goal = useAppState((s) => s.goal)
  const meals = useAppState((s) => s.meals)
  const weights = useAppState((s) => s.weights)
  const water = useAppState((s) => s.water)

  const today = todayKey()
  const todaysMeals = meals.filter((m) => m.date === today)
  const targets = profile ? macroTargets(profile, goal) : null
  const eaten = {
    calories: todaysMeals.reduce((a, m) => a + m.calories, 0),
    protein: todaysMeals.reduce((a, m) => a + m.protein, 0),
    carbs: todaysMeals.reduce((a, m) => a + m.carbs, 0),
    fat: todaysMeals.reduce((a, m) => a + m.fat, 0),
  }
  const glasses = water[today] ?? 0
  const latestWeight = weights.length ? weights[weights.length - 1] : null
  const week = lastNDays(7).map((d) => ({
    day: d.slice(5),
    kcal: Math.round(meals.filter((m) => m.date === d).reduce((a, m) => a + m.calories, 0)),
  }))
  const weightChart = weights.slice(-14).map((w) => ({ date: w.date.slice(5), kg: w.kg }))

  const pct = (v: number, t?: number | null) => (t ? Math.min(100, Math.round((v / t) * 100)) : 0)

  const macroRow = (label: string, v: number, t: number, unit = 'g') => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {Math.round(v)}{unit} / {t}{unit}
        </span>
      </div>
      <Progress value={pct(v, t)} />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            {latestWeight ? ` · ${latestWeight.kg} kg` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <WeightDialog />
          <MealDialog />
        </div>
      </div>

      {!profile && (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Set your baseline metrics to unlock calorie and macro targets.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/baseline">
                Set baseline <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Flame className="h-4 w-4 text-orange-500" />} label="Calories today"
          value={`${Math.round(eaten.calories)}`} unit={targets ? `of ${targets.calories} kcal` : 'kcal'}
          progress={pct(eaten.calories, targets?.calories)} />
        <StatCard icon={<Beef className="h-4 w-4 text-rose-500" />} label="Protein today"
          value={`${Math.round(eaten.protein)}`} unit={targets ? `of ${targets.protein} g` : 'g'}
          progress={pct(eaten.protein, targets?.protein)} />
        <StatCard icon={<Droplets className="h-4 w-4 text-sky-500" />} label="Water"
          value={`${glasses}`} unit={`of 8 glasses`}
          progress={pct(glasses, 8)}
          action={
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => addWater(today, 1)}>+1</Button>
              <Button size="sm" variant="ghost" onClick={() => addWater(today, -1)}>−1</Button>
            </div>
          } />
        <StatCard icon={<Scale className="h-4 w-4 text-emerald-500" />} label="Current weight"
          value={latestWeight ? `${latestWeight.kg}` : '—'} unit={latestWeight ? `kg · ${latestWeight.date.slice(5)}` : 'not logged'}
          progress={0} hideBar />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Macros today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {targets ? (
              <>
                {macroRow('Protein', eaten.protein, targets.protein)}
                {macroRow('Carbs', eaten.carbs, targets.carbs)}
                {macroRow('Fat', eaten.fat, targets.fat)}
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Targets derived from {goal ? `${goal.type} goal` : 'maintenance'} · TDEE-based
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Set baseline metrics to see macro targets.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's meals</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysMeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing logged yet. Add a meal or ask the coach to plan your day.</p>
            ) : (
              <div className="space-y-2">
                {todaysMeals.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(m.calories)} kcal · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.source !== 'manual' && <Badge variant="secondary" className="text-xs">{m.source}</Badge>}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeMeal(m.id)} aria-label="Delete meal">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calories · last 7 days</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week}>
                <XAxis dataKey="day" fontSize={11} tickLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="kcal" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weight trend</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {weightChart.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} fontSize={11} width={40} />
                  <Tooltip />
                  <Line type="monotone" dataKey="kg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Log your weight a few times to see the trend.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <CoachPanel />
    </div>
  )
}

function StatCard(props: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  progress: number
  hideBar?: boolean
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{props.label}</CardTitle>
        {props.icon}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-bold">{props.value}</p>
          <p className="text-xs text-muted-foreground">{props.unit}</p>
        </div>
        {!props.hideBar && <Progress value={props.progress} />}
        {props.action}
      </CardContent>
    </Card>
  )
}

function WeightDialog() {
  const [open, setOpen] = useState(false)
  const [kg, setKg] = useState('')
  const submit = () => {
    const v = Number(kg)
    if (!(v > 20) || !(v < 400)) return
    upsertWeights([{ id: uid(), date: todayKey(), kg: v, updatedAt: Date.now() }])
    setKg('')
    setOpen(false)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Scale className="mr-2 h-4 w-4" /> Log weight
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log today's weight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Weight (kg)</Label>
            <Input type="number" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} />
          </div>
          <Button className="w-full" onClick={submit} disabled={!(Number(kg) > 0)}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
