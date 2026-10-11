import type { AppState, Meal, WeightEntry } from '@/types'
import { uid } from './metrics'
import { getState, setState, upsertMeals, upsertWeights, logSync, updateConnector } from './store'

/** Compact, agent-readable context payload — what we hand to Gemini / Spark. */
export function buildContextPayload(s: AppState = getState()) {
  return {
    app: 'nutri-sync',
    exportedAt: new Date().toISOString(),
    profile: s.profile ?? null,
    goal: s.goal ?? null,
    targets: null, // filled by caller if profile exists
    meals: s.meals,
    weights: s.weights,
    water: s.water,
    syncLogCount: s.syncLog.length,
  }
}

/* ---------------- CSV bridge ---------------- */

export function mealsToCsv(meals: Meal[]): string {
  const head = 'id,date,name,calories,protein,carbs,fat,source,updatedAt'
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`
  const rows = meals.map((m) =>
    [m.id, m.date, m.name, m.calories, m.protein, m.carbs, m.fat, m.source, m.updatedAt]
      .map(esc)
      .join(','),
  )
  return [head, ...rows].join('\n')
}

export function mealsFromCsv(text: string): Meal[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map((h) => h.replaceAll('"', '').trim())
  const idx = (name: string) => header.indexOf(name)
  const out: Meal[] = []
  for (const line of lines.slice(1)) {
    // split on commas not inside quotes
    const cells = line.match(/("([^"]|"")*"|[^,]+)/g) ?? []
    const val = (name: string, fallback = '') => {
      const i = idx(name)
      if (i < 0 || i >= cells.length) return fallback
      return cells[i].replace(/^"|"$/g, '').replaceAll('""', '"')
    }
    const num = (name: string) => Number(val(name, '0')) || 0
    out.push({
      id: val('id') || uid(),
      date: val('date') || new Date().toISOString().slice(0, 10),
      name: val('name') || 'Imported meal',
      calories: num('calories'),
      protein: num('protein'),
      carbs: num('carbs'),
      fat: num('fat'),
      source: (val('source') as Meal['source']) || 'csv',
      updatedAt: num('updatedAt') || Date.now(),
    })
  }
  return out
}

/* ---------------- JSON backup (inbound merge, last-write-wins) ---------------- */

export function stateToJson(s: AppState = getState()): string {
  return JSON.stringify(s, null, 2)
}

export interface ImportResult {
  meals: number
  weights: number
  waterDays: number
}

export function mergeImport(text: string): ImportResult {
  const parsed = JSON.parse(text) as Partial<AppState>
  const result: ImportResult = { meals: 0, weights: 0, waterDays: 0 }
  if (Array.isArray(parsed.meals)) {
    upsertMeals(parsed.meals)
    result.meals = parsed.meals.length
  }
  if (Array.isArray(parsed.weights)) {
    upsertWeights(parsed.weights)
    result.weights = parsed.weights.length
  }
  if (parsed.water && typeof parsed.water === 'object') {
    const s = getState()
    setWaterMerged(s.water, parsed.water)
    result.waterDays = Object.keys(parsed.water).length
  }
  return result
}

function setWaterMerged(current: AppState['water'], incoming: AppState['water']) {
  // water is a counter, not an event log: take the max to avoid double counting
  const merged = { ...current }
  for (const [date, glasses] of Object.entries(incoming)) {
    merged[date] = Math.max(merged[date] ?? 0, glasses)
  }
  setState({ water: merged })
}

/* ---------------- Google Sheets bridge (Apps Script web app) ---------------- */

export async function sheetsPush(webhookUrl: string, payload: unknown): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'push', payload }),
  })
  if (!res.ok) throw new Error(`Sheets bridge returned ${res.status}`)
}

export async function sheetsPull(webhookUrl: string): Promise<Partial<AppState>> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'pull' }),
  })
  if (!res.ok) throw new Error(`Sheets bridge returned ${res.status}`)
  return (await res.json()) as Partial<AppState>
}

/* ---------------- shared file download helper ---------------- */

export function downloadFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ---------------- orchestrated sync ---------------- */

export async function runSheetsSync(webhookUrl: string): Promise<void> {
  updateConnector('sheets', { connected: true })
  // outbound first: give the sheet everything we have
  await sheetsPush(webhookUrl, buildContextPayload(getState()))
  logSync({ direction: 'outbound', connector: 'Google Sheets', summary: 'Pushed profile, goal and full meal/weight log' })
  updateConnector('sheets', { lastSyncAt: Date.now(), statusNote: 'Push complete' })
  // inbound: pull anything the sheet (or a teammate / Spark) added or corrected
  const pulled = await sheetsPull(webhookUrl)
  let summary = ''
  if (pulled.meals || pulled.weights || pulled.water) {
    const r = mergeInline(pulled)
    summary = `Pulled ${r.meals} meals, ${r.weights} weight entries, ${r.waterDays} water days`
    logSync({ direction: 'inbound', connector: 'Google Sheets', summary })
  } else {
    summary = 'Pull complete — no new data'
    logSync({ direction: 'inbound', connector: 'Google Sheets', summary })
  }
  updateConnector('sheets', { lastSyncAt: Date.now(), statusNote: summary })
}

function mergeInline(pulled: Partial<AppState>): ImportResult {
  const result: ImportResult = { meals: 0, weights: 0, waterDays: 0 }
  if (Array.isArray(pulled.meals)) {
    upsertMeals(pulled.meals as Meal[])
    result.meals = (pulled.meals as Meal[]).length
  }
  if (Array.isArray(pulled.weights)) {
    upsertWeights(pulled.weights as WeightEntry[])
    result.weights = (pulled.weights as WeightEntry[]).length
  }
  return result
}
