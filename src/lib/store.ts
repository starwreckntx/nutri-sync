import { useSyncExternalStore } from 'react'
import type { AppState, Connector, Meal, SyncLogEntry, WeightEntry } from '@/types'
import { uid } from './metrics'

const STORAGE_KEY = 'nutri-sync:v1'

export const DEFAULT_CONNECTORS: Connector[] = [
  {
    id: 'gemini',
    name: 'Gemini AI Coach',
    description:
      'Two-way intelligence layer. Sends your metrics & goals to Gemini and writes meal plans and coaching answers straight back into your log.',
    direction: 'bidirectional',
    connected: false,
  },
  {
    id: 'sheets',
    name: 'Google Sheets Bridge',
    description:
      'Bidirectional bridge to a Google Sheet (via a deployed Apps Script web app). Push daily logs out, pull corrections back in — no resistance, no copy-paste.',
    direction: 'bidirectional',
    connected: false,
  },
  {
    id: 'csv',
    name: 'CSV Bridge',
    description: 'Import meal logs from any app or CSV export. Exports your full meal history for use anywhere else.',
    direction: 'bidirectional',
    connected: true,
  },
  {
    id: 'json',
    name: 'JSON Backup',
    description: 'Full-fidelity snapshot of every metric, goal, meal and sync record. Restore on any device.',
    direction: 'bidirectional',
    connected: true,
  },
  {
    id: 'google-fit',
    name: 'Google Fit',
    description: 'OAuth 2.0 connector for activity, steps and weight from Google Fit. Configure a client ID to activate.',
    direction: 'inbound',
    connected: false,
    statusNote: 'Awaiting OAuth client configuration',
  },
]

function defaultState(): AppState {
  return {
    meals: [],
    weights: [],
    water: {},
    connectors: DEFAULT_CONNECTORS,
    syncLog: [],
    settings: {},
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as AppState
    return { ...defaultState(), ...parsed }
  } catch {
    return defaultState()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getState(): AppState {
  return state
}

export function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch }
  persist()
  listeners.forEach((l) => l())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Select stable references (fields), not freshly-computed objects. */
export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

/* ---------- domain actions ---------- */

export function setProfile(profile: AppState['profile']) {
  setState({ profile })
}

export function setGoal(goal: AppState['goal']) {
  setState({ goal })
}

export function addMeal(meal: Omit<Meal, 'id' | 'updatedAt'>) {
  setState({
    meals: [...state.meals, { ...meal, id: uid(), updatedAt: Date.now() }],
  })
}

export function upsertMeals(incoming: Meal[]) {
  const byId = new Map(state.meals.map((m) => [m.id, m]))
  for (const m of incoming) {
    const existing = byId.get(m.id)
    if (!existing || m.updatedAt >= existing.updatedAt) byId.set(m.id, m)
  }
  setState({ meals: [...byId.values()] })
}

export function removeMeal(id: string) {
  setState({ meals: state.meals.filter((m) => m.id !== id) })
}

export function upsertWeights(incoming: WeightEntry[]) {
  const byDate = new Map(state.weights.map((w) => [w.date, w]))
  for (const w of incoming) {
    const existing = byDate.get(w.date)
    if (!existing || w.updatedAt >= existing.updatedAt) byDate.set(w.date, w)
  }
  setState({ weights: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) })
}

export function addWater(date: string, glasses: number) {
  setState({ water: { ...state.water, [date]: Math.max(0, (state.water[date] ?? 0) + glasses) } })
}

export function updateConnector(id: string, patch: Partial<Connector>) {
  setState({
    connectors: state.connectors.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  })
}

export function logSync(entry: Omit<SyncLogEntry, 'id' | 'time'>) {
  setState({
    syncLog: [{ ...entry, id: uid(), time: Date.now() }, ...state.syncLog].slice(0, 100),
  })
}
