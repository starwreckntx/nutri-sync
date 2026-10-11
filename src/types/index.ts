export type Sex = 'male' | 'female'

/** Baseline body metrics captured during onboarding. */
export interface BaselineMetrics {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  bodyFatPct?: number
  waistCm?: number
  /** 1 = sedentary … 5 = very active */
  activityLevel: 1 | 2 | 3 | 4 | 5
}

export type GoalType = 'lose' | 'maintain' | 'gain' | 'recomp' | 'performance'

/** Goal intake: what the user wants and how fast they want it. */
export interface Goal {
  id: string
  type: GoalType
  targetWeightKg?: number
  /** kg per week, signed by goal direction */
  weeklyRateKg: number
  targetDate?: string
  proteinPerKg: number
  /** optional manual override, kcal/day */
  customCalories?: number
  notes?: string
  createdAt: string
}

export type MealSource = 'manual' | 'gemini' | 'csv' | 'sheets' | 'mcp'

export interface Meal {
  id: string
  name: string
  /** YYYY-MM-DD (local) */
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  source: MealSource
  updatedAt: number
}

export interface WeightEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  kg: number
  updatedAt: number
}

export type ConnectorDirection = 'inbound' | 'outbound' | 'bidirectional'

export interface Connector {
  id: string
  name: string
  description: string
  direction: ConnectorDirection
  connected: boolean
  lastSyncAt?: number
  config?: Record<string, string>
  statusNote?: string
}

export interface SyncLogEntry {
  id: string
  time: number
  direction: 'inbound' | 'outbound'
  connector: string
  summary: string
}

export interface Settings {
  geminiApiKey?: string
  sheetsWebhookUrl?: string
}

export interface AppState {
  profile?: BaselineMetrics
  goal?: Goal
  meals: Meal[]
  weights: WeightEntry[]
  /** date -> glasses of water */
  water: Record<string, number>
  connectors: Connector[]
  syncLog: SyncLogEntry[]
  settings: Settings
}
