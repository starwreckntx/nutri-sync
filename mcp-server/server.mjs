#!/usr/bin/env node
/**
 * NutriSync MCP server — stdio transport, zero dependencies.
 *
 * Lets Gemini Spark (or any MCP client: Gemini CLI, Claude Desktop, etc.)
 * talk to your nutrition data in both directions:
 *
 *   inbound to Spark : get_profile, get_goals, get_today_summary, get_context
 *   outbound from Spark: log_meal, log_weight
 *
 * Data file: a NutriSync JSON backup exported from the app
 * (Connectors → JSON Backup), or the server creates a fresh one.
 *
 * Usage:  node mcp-server/server.mjs [path/to/nutri-sync.json]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const PROTOCOL_VERSION = '2025-06-18'
const dataPath = process.argv[2] ?? new URL('./nutri-sync-data.json', import.meta.url).pathname

/* ---------------- data layer ---------------- */

const empty = () => ({ meals: [], weights: [], water: {}, syncLog: [] })

function load() {
  if (!existsSync(dataPath)) return empty()
  try {
    return { ...empty(), ...JSON.parse(readFileSync(dataPath, 'utf8')) }
  } catch {
    return empty()
  }
}

function save(state) {
  writeFileSync(dataPath, JSON.stringify(state, null, 2))
}

const todayKey = () => new Date().toISOString().slice(0, 10)

function todaySummary(state) {
  const today = todayKey()
  const meals = state.meals.filter((m) => m.date === today)
  return {
    date: today,
    meals: meals.map(({ name, calories, protein, carbs, fat }) => ({ name, calories, protein, carbs, fat })),
    totals: meals.reduce(
      (a, m) => ({
        calories: a.calories + m.calories,
        protein: a.protein + m.protein,
        carbs: a.carbs + m.carbs,
        fat: a.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ),
    waterGlasses: state.water?.[today] ?? 0,
  }
}

/* ---------------- MCP tool definitions ---------------- */

const tools = [
  {
    name: 'get_profile',
    description: 'Read the user baseline metrics (sex, age, height, weight, body fat, activity level).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_goals',
    description: 'Read the active nutrition goal (type, pace, targets, dietary notes).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_today_summary',
    description: 'Read everything logged today: meals, macro totals and water.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_context',
    description: 'Full compact context payload: profile, goal, recent meals and weight trend. Use for grounded answers.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'log_meal',
    description: 'Write a meal into the NutriSync log (source: mcp). Returns the created meal.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Meal name' },
        calories: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
        date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      },
      required: ['name', 'calories'],
    },
  },
  {
    name: 'log_weight',
    description: 'Write a body-weight entry (kg) for a date.',
    inputSchema: {
      type: 'object',
      properties: {
        kg: { type: 'number' },
        date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      },
      required: ['kg'],
    },
  },
]

function callTool(name, args) {
  const state = load()
  switch (name) {
    case 'get_profile':
      return state.profile ?? null
    case 'get_goals':
      return state.goal ?? null
    case 'get_today_summary':
      return todaySummary(state)
    case 'get_context':
      return {
        profile: state.profile ?? null,
        goal: state.goal ?? null,
        today: todaySummary(state),
        recentWeights: (state.weights ?? []).slice(-14),
      }
    case 'log_meal': {
      const meal = {
        id: randomUUID(),
        name: String(args.name),
        date: args.date ?? todayKey(),
        calories: Number(args.calories) || 0,
        protein: Number(args.protein) || 0,
        carbs: Number(args.carbs) || 0,
        fat: Number(args.fat) || 0,
        source: 'mcp',
        updatedAt: Date.now(),
      }
      state.meals.push(meal)
      state.syncLog = [
        { id: randomUUID(), time: Date.now(), direction: 'inbound', connector: 'MCP / Gemini Spark', summary: `Spark logged meal "${meal.name}"` },
        ...(state.syncLog ?? []),
      ].slice(0, 100)
      save(state)
      return meal
    }
    case 'log_weight': {
      const entry = { id: randomUUID(), date: args.date ?? todayKey(), kg: Number(args.kg), updatedAt: Date.now() }
      state.weights = [...(state.weights ?? []).filter((w) => w.date !== entry.date), entry]
        .sort((a, b) => a.date.localeCompare(b.date))
      save(state)
      return entry
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

/* ---------------- stdio transport ---------------- */

const respond = (msg) => process.stdout.write(JSON.stringify(msg) + '\n')

process.stdin.setEncoding('utf8')
let buffer = ''
process.stdin.on('data', (chunk) => {
  buffer += chunk
  let nl
  while ((nl = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, nl)
    buffer = buffer.slice(nl + 1)
    if (!line.trim()) continue
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }
    handle(msg)
  }
})

function handle(msg) {
  const { id, method, params } = msg
  try {
    if (method === 'initialize') {
      respond({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: 'nutri-sync', version: '1.0.0' },
        },
      })
    } else if (method === 'notifications/initialized') {
      /* no-op */
    } else if (method === 'ping') {
      respond({ jsonrpc: '2.0', id, result: {} })
    } else if (method === 'tools/list') {
      respond({ jsonrpc: '2.0', id, result: { tools } })
    } else if (method === 'tools/call') {
      const result = callTool(params.name, params.arguments ?? {})
      respond({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      })
    } else {
      respond({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } })
    }
  } catch (err) {
    respond({
      jsonrpc: '2.0',
      id,
      result: { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true },
    })
  }
}
