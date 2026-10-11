import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAppState, setGoal } from '@/lib/store'
import { calorieTarget, defaultWeeklyRate, macroTargets } from '@/lib/metrics'
import { uid } from '@/lib/metrics'
import type { GoalType } from '@/types'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'

const GOAL_LABELS: Record<GoalType, string> = {
  lose: 'Lose fat',
  maintain: 'Maintain',
  gain: 'Gain muscle',
  recomp: 'Body recomposition',
  performance: 'Athletic performance',
}

export default function Goals() {
  const profile = useAppState((s) => s.profile)
  const existing = useAppState((s) => s.goal)

  const [type, setType] = useState<GoalType>(existing?.type ?? 'lose')
  const [weeklyRate, setWeeklyRate] = useState(Math.abs(existing?.weeklyRateKg ?? 0.5))
  const [targetWeight, setTargetWeight] = useState(existing?.targetWeightKg ? String(existing.targetWeightKg) : '')
  const [proteinPerKg, setProteinPerKg] = useState(existing?.proteinPerKg ?? 1.8)
  const [customCalories, setCustomCalories] = useState(existing?.customCalories ? String(existing.customCalories) : '')
  const [targetDate, setTargetDate] = useState(existing?.targetDate ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const previewGoal = {
    id: existing?.id ?? 'preview',
    type,
    weeklyRateKg: signedRate(type, weeklyRate),
    proteinPerKg,
    targetWeightKg: targetWeight ? Number(targetWeight) : undefined,
    customCalories: customCalories ? Number(customCalories) : undefined,
    targetDate: targetDate || undefined,
    notes: notes || undefined,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
  const targets = profile ? macroTargets(profile, previewGoal) : null

  const save = () => {
    setGoal({ ...previewGoal, id: uid(), createdAt: new Date().toISOString() })
    toast.success('Goal saved — pushed to dashboard and every connector')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goal Intake</h1>
        <p className="text-sm text-muted-foreground">
          Tell NutriSync where you're headed. Targets propagate to the dashboard, Gemini context and every sync.
        </p>
      </div>

      {!profile && (
        <Card className="border-dashed">
          <CardContent className="py-4 text-sm text-muted-foreground">
            No baseline yet — calorie numbers will stay hidden until you set one. Targets will use assumed values
            for preview.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">What do you want?</CardTitle>
            <CardDescription>A 60-second intake — everything else is calculated for you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setType(g)
                    setWeeklyRate(Math.abs(defaultWeeklyRate(g)))
                  }}
                  className={`rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
                    type === g ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                >
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Pace: {signedRate(type, weeklyRate)} kg / week</Label>
                <span className="text-muted-foreground">
                  {type === 'maintain' || type === 'performance' ? 'steady' : weeklyRate >= 0.5 ? 'aggressive' : weeklyRate >= 0.25 ? 'moderate' : 'gentle'}
                </span>
              </div>
              <Slider value={[weeklyRate]} min={0.1} max={1} step={0.05} onValueChange={([v]) => setWeeklyRate(v)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Target weight (kg, optional)</Label>
                <Input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Target date (optional)</Label>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Protein per kg body weight</Label>
                <Select value={String(proteinPerKg)} onValueChange={(v) => setProteinPerKg(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.4">1.4 g — minimum</SelectItem>
                    <SelectItem value="1.8">1.8 g — recommended</SelectItem>
                    <SelectItem value="2.2">2.2 g — athlete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Manual calories (optional)</Label>
                <Input type="number" placeholder="Overrides calculated target" value={customCalories} onChange={(e) => setCustomCalories(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Dietary notes &amp; preferences</Label>
              <Textarea
                placeholder="e.g. vegetarian, halal, nut allergy, dislike fish… The Gemini coach reads these."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={save} disabled={type === 'maintain' && !notes && !targetWeight && !targetDate && !existing}>
              <Flag className="mr-2 h-4 w-4" /> Commit goal
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Derived daily targets</CardTitle>
              <CardDescription>Live preview — saved the moment you commit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {targets ? (
                <>
                  <TargetRow label="Calories" value={`${targets.calories} kcal`} highlight />
                  <TargetRow label="Protein" value={`${targets.protein} g`} />
                  <TargetRow label="Carbs" value={`${targets.carbs} g`} />
                  <TargetRow label="Fat" value={`${targets.fat} g`} />
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{GOAL_LABELS[type]}</Badge>
                    {previewGoal.targetWeightKg && <Badge variant="secondary">→ {previewGoal.targetWeightKg} kg</Badge>}
                    {previewGoal.targetDate && <Badge variant="secondary">by {previewGoal.targetDate}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {previewGoal.customCalories
                      ? 'Using your manual calorie override.'
                      : `TDEE ${profile ? calorieTarget(profile) : '—'} kcal adjusted by your pace.`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Set a baseline to see numbers here.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function signedRate(type: GoalType, abs: number): number {
  return type === 'gain' ? abs : type === 'maintain' || type === 'performance' ? 0 : -abs
}

function TargetRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</span>
    </div>
  )
}
