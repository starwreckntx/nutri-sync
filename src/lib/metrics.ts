import type { BaselineMetrics, Goal } from '@/types'

export const ACTIVITY_LABELS = [
  '',
  'Sedentary (desk job, little exercise)',
  'Light (1–3 workouts / week)',
  'Moderate (3–5 workouts / week)',
  'Active (6–7 workouts / week)',
  'Very active (physical job + training)',
] as const

const ACTIVITY_FACTORS = [0, 1.2, 1.375, 1.55, 1.725, 1.9] as const

/** Mifflin–St Jeor basal metabolic rate, kcal/day */
export function bmr(p: BaselineMetrics): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age
  return Math.round(p.sex === 'male' ? base + 5 : base - 161)
}

/** Total daily energy expenditure, kcal/day */
export function tdee(p: BaselineMetrics): number {
  return Math.round(bmr(p) * ACTIVITY_FACTORS[p.activityLevel])
}

export function bmi(p: BaselineMetrics): number {
  const m = p.heightCm / 100
  return Math.round((p.weightKg / (m * m)) * 10) / 10
}

/** Signed weekly rate implied by a goal type (kg/week). */
export function defaultWeeklyRate(type: Goal['type']): number {
  switch (type) {
    case 'lose':
      return -0.5
    case 'gain':
      return 0.25
    case 'recomp':
      return -0.15
    default:
      return 0
  }
}

/** Daily calorie target derived from TDEE + goal pace. */
export function calorieTarget(p: BaselineMetrics, g?: Goal): number {
  if (!g) return tdee(p)
  if (g.customCalories && g.customCalories > 0) return Math.round(g.customCalories)
  // ~1 kg of body weight ≈ 7 700 kcal
  const adjustment = (g.weeklyRateKg * 7700) / 7
  return Math.max(1200, Math.round(tdee(p) + adjustment))
}

export interface MacroTargets {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function macroTargets(p: BaselineMetrics, g?: Goal): MacroTargets {
  const calories = calorieTarget(p, g)
  const protein = Math.round(p.weightKg * (g?.proteinPerKg ?? 1.8))
  const fat = Math.round((calories * 0.27) / 9)
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
  return { calories, protein, carbs, fat }
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function lastNDays(n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(todayKey(d))
  }
  return out
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
