import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { useAppState, setProfile } from '@/lib/store'
import { ACTIVITY_LABELS, bmi, bmr, tdee } from '@/lib/metrics'
import type { BaselineMetrics, Sex } from '@/types'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

export default function Baseline() {
  const profile = useAppState((s) => s.profile)
  const [form, setForm] = useState<BaselineMetrics>(
    profile ?? { sex: 'male', age: 30, heightCm: 175, weightKg: 75, activityLevel: 2 },
  )

  const num = (v: string) => (v === '' ? 0 : Number(v))
  const patch = (p: Partial<BaselineMetrics>) => setForm((f) => ({ ...f, ...p }))

  const preview = form.weightKg > 0 && form.heightCm > 0 ? form : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Baseline Metrics</h1>
        <p className="text-sm text-muted-foreground">
          The starting point every target, sync and AI recommendation is built on.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Your measurements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sex</Label>
                <Select value={form.sex} onValueChange={(v) => patch({ sex: v as Sex })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input type="number" min="10" max="100" value={form.age || ''} onChange={(e) => patch({ age: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Height (cm)</Label>
                <Input type="number" min="100" max="250" value={form.heightCm || ''} onChange={(e) => patch({ heightCm: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input type="number" min="30" max="300" step="0.1" value={form.weightKg || ''} onChange={(e) => patch({ weightKg: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Body fat % (optional)</Label>
                <Input type="number" min="3" max="60" step="0.1" value={form.bodyFatPct ?? ''} onChange={(e) => patch({ bodyFatPct: e.target.value === '' ? undefined : num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Waist (cm, optional)</Label>
                <Input type="number" min="40" max="200" value={form.waistCm ?? ''} onChange={(e) => patch({ waistCm: e.target.value === '' ? undefined : num(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Activity level</Label>
                <span className="text-muted-foreground">{form.activityLevel} / 5</span>
              </div>
              <Slider value={[form.activityLevel]} min={1} max={5} step={1} onValueChange={([v]) => patch({ activityLevel: v as 1 | 2 | 3 | 4 | 5 })} />
              <p className="text-xs text-muted-foreground">{ACTIVITY_LABELS[form.activityLevel]}</p>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setProfile(form)
                toast.success('Baseline saved — targets recalculated')
              }}
            >
              <Save className="mr-2 h-4 w-4" /> Save baseline
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live readout</CardTitle>
              <CardDescription>Recalculated the moment your metrics change</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview ? (
                <>
                  <Readout label="BMI" value={String(bmi(preview))} />
                  <Readout label="BMR (Mifflin–St Jeor)" value={`${bmr(preview)} kcal`} />
                  <Readout label="TDEE" value={`${tdee(preview)} kcal`} highlight />
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    TDEE is your maintenance intake. Your goal intake and macros are derived from it on the Goal
                    Intake page.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enter height and weight to see the readout.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardContent className="py-4 text-xs text-muted-foreground">
              Synced out: your baseline travels with every connector push (Sheets, JSON backup, Gemini context) so
              every tool in your ecosystem works from the same numbers.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Readout({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</span>
    </div>
  )
}
