import type { AppState, Meal } from '@/types'
import { todayKey } from './metrics'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'gemini-2.5-flash'

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}

async function callGemini(apiKey: string, system: string, user: string): Promise<string> {
  const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini API ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = (await res.json()) as GeminiResponse
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
  if (!text) throw new Error('Gemini returned an empty response')
  return text
}

/** Compact context block appended to every Gemini call so answers are grounded in real data. */
export function contextSummary(s: AppState): string {
  const p = s.profile
  const g = s.goal
  const today = todayKey()
  const todaysMeals = s.meals.filter((m) => m.date === today)
  const kcal = todaysMeals.reduce((a, m) => a + m.calories, 0)
  const protein = todaysMeals.reduce((a, m) => a + m.protein, 0)
  const latestWeight = s.weights.length ? s.weights[s.weights.length - 1] : null
  return [
    'USER CONTEXT (nutri-sync):',
    p
      ? `- ${p.sex}, ${p.age}y, ${p.heightCm}cm, ${p.weightKg}kg${p.bodyFatPct ? `, ~${p.bodyFatPct}% body fat` : ''}, activity level ${p.activityLevel}/5`
      : '- No baseline profile yet',
    g
      ? `- Goal: ${g.type}, ${g.weeklyRateKg} kg/week${g.targetWeightKg ? `, target ${g.targetWeightKg}kg` : ''}${g.notes ? `, notes: ${g.notes}` : ''}`
      : '- No goal set',
    `- Today (${today}): ${todaysMeals.length} meals logged, ${Math.round(kcal)} kcal, ${Math.round(protein)}g protein`,
    latestWeight ? `- Latest weight: ${latestWeight.kg}kg on ${latestWeight.date}` : '- No weight entries',
  ].join('\n')
}

/** Ask the coach anything; returns the reply text. */
export async function coachChat(apiKey: string, state: AppState, history: { role: 'user' | 'model'; text: string }[], question: string): Promise<string> {
  const system = [
    'You are NutriSync Coach, a practical, encouraging nutrition coach.',
    'Give concise, specific, actionable advice. Use metric units.',
    'Ground every answer in the user context below.',
    'Never invent data the user has not logged.',
    contextSummary(state),
  ].join('\n')
  const transcript = history.map((h) => `${h.role === 'user' ? 'User' : 'Coach'}: ${h.text}`).join('\n')
  return callGemini(apiKey, system, `${transcript}\nUser: ${question}`)
}

/** Ask Gemini for a one-day meal plan that fits the user's targets, then write it into the log. */
export async function generateMealPlan(
  apiKey: string,
  state: AppState,
  targets: { calories: number; protein: number },
): Promise<Meal[]> {
  const system = [
    'You are a meal-plan generator inside NutriSync.',
    'Reply with ONLY a JSON array — no markdown fences, no commentary.',
    'Each element: {"name": string, "calories": number, "protein": number, "carbs": number, "fat": number}.',
    'The array must be a full day of eating (3–5 meals) that hits the calorie and protein targets as closely as possible.',
    'Prefer simple whole foods. Respect any dietary notes in the goal.',
    contextSummary(state),
  ].join('\n')
  const user = `Generate today's meal plan. Targets: ${targets.calories} kcal, ${targets.protein}g protein. Date: ${todayKey()}`
  const text = await callGemini(apiKey, system, user)
  const cleaned = text.replace(/```(?:json)?/g, '').trim()
  const parsed = JSON.parse(cleaned) as Omit<Meal, 'id' | 'date' | 'source' | 'updatedAt'>[]
  if (!Array.isArray(parsed)) throw new Error('Unexpected meal plan format')
  const date = todayKey()
  return parsed.map((m) => ({
    ...m,
    id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date,
    source: 'gemini' as const,
    updatedAt: Date.now(),
  }))
}
