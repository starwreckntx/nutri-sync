# NutriSync

Integrate and accelerate your optimal nutrition. NutriSync is a dashboard-first nutrition app built around
**baseline metrics**, **goal intake**, and **integrative connector tooling** — a seamless, two-way communication
path between you, your data, and the Google ecosystem (including **Gemini Spark**), with no resistance.

![stack](https://img.shields.io/badge/React%2019-TypeScript-blue) ![stack](https://img.shields.io/badge/Vite-Tailwind-38bdf8) ![stack](https://img.shields.io/badge/MCP-Gemini%20Spark-8b5cf6)

## Quickstart — Spark native mode (3 steps, no local runtime)

The default runtime is **zero-dependency cloud mode**: Gemini Spark runs your nutrition loop on
its own schedule, 24/7, using a Google Sheet as the database. Nothing to install, nothing to keep awake.

1. **Create the tracker.** Make a Google Sheet named **NutriSync Tracker** with the three tabs
   from [`spark/templates/sheets-schema.json`](spark/templates/sheets-schema.json)
   (or import [`spark/templates/nutrisync-tracker-template.csv`](spark/templates/nutrisync-tracker-template.csv))
   and fill in your numbers on the **Profile & Goals** tab.
2. **Teach Spark.** In Gemini → Skills, upload the two skill files:
   [`nutrisync-coach`](spark/skills/nutrisync-coach/SKILL.md) and
   [`nutrisync-scribe`](spark/skills/nutrisync-scribe/SKILL.md).
3. **Schedule it.** Paste the five blocks from [`spark/schedules-native.md`](spark/schedules-native.md)
   into Spark — morning briefing, evening check-in, weigh-in monitor, weekly review, meal-prep planner.

Done: Spark briefs you daily, logs meals by voice from Android, reviews your week into a Google
Doc, and plans your grocery run — all on cloud time. Prefer a local data pipe instead? The MCP
server mode remains available under [`spark/`](spark/README.md).

## What it does

- **Dashboard** — calories, protein, macros, water and weight trend at a glance, with 7-day charts.
- **Baseline Metrics** — age, sex, height, weight, body fat, activity level → live BMR / TDEE / BMI
  (Mifflin–St Jeor). Every downstream number is built on this.
- **Goal Intake** — a 60-second intake (lose / maintain / gain / recomp / performance, pace, protein
  density, dietary notes) that derives daily calorie and macro targets automatically.
- **Connectors** — the integrative tooling layer. Each connector is explicit about its direction
  (inbound / outbound / two-way) and everything is recorded in an auditable sync log:
  - **Gemini AI Coach** *(two-way)* — sends your metrics, goal and today's log to Gemini; writes meal plans
    and coaching answers straight back into your log.
  - **Google Sheets Bridge** *(two-way)* — push a full snapshot to a Google Sheet via the bundled Apps Script
    (`sheets-bridge/Code.gs`); edits made in the sheet (by you, a coach, or Gemini Spark) are pulled back,
    merged last-write-wins.
  - **CSV Bridge** *(two-way)* — import meal logs from any app, export yours anywhere.
  - **JSON Backup** *(two-way)* — full-fidelity snapshots; restore merges instead of overwriting.
  - **Google Fit** *(inbound, planned)* — OAuth connector stub for activity and weight.
- **Persistence** — everything lives in `localStorage` and survives restarts; backup/restore makes it
  portable across devices.
- **MCP server for Gemini Spark** — `mcp-server/server.mjs` exposes your data over the Model Context
  Protocol (stdio, zero dependencies), so Gemini Spark can act as a Google-ecosystem integrator:
  Spark reads profile/goals/summaries and logs meals back into NutriSync, both directions, no copy-paste.

## App: local development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build → dist/
```

Then:

1. **Baseline Metrics** → save your measurements.
2. **Goal Intake** → commit a goal.
3. **Connectors** → paste a Gemini API key (from [Google AI Studio](https://aistudio.google.com/apikey))
   and optionally deploy the Sheets bridge.

## Gemini Spark integration — a Spark-native runtime

Gemini Spark is Google's always-on agent with native Google Workspace access, scheduled tasks,
teachable skills and third-party connectivity via MCP. NutriSync ships everything Spark needs
to **be** the nutrition runtime — Spark supplies the scheduling engine, Google access and
Android presence; the repo supplies the Skills, Schedules and data pipe:

```
spark/
  skills/nutrisync-coach/SKILL.md    → grounded answers & reviews from your real data
  skills/nutrisync-scribe/SKILL.md   → voice-first natural-language meal logging
  schedules.md                       → paste-ready daily / weekly / monitor triggers
  android.md                         → notifications, voice logging, Health Connect, safety
mcp-server/server.mjs                → the two-way MCP data pipe (zero dependencies)
```

| Spark layer | NutriSync piece |
|---|---|
| **Schedules** (time-based, Gmail-triggered, monitors) | `spark/schedules.md` — morning briefing, evening check-in, weekly review, meal-prep planner, weigh-in monitor |
| **Skills** (reusable instructions) | `spark/skills/*` — coach persona with strict no-invented-data guardrails; scribe for 5-second logging |
| **Google access** (Workspace, cloud runs) | Briefings to Docs, shopping lists via Gmail, prep blocks in Calendar |
| **Android integrations** | Spark notifications, Gemini voice logging via the scribe skill, Health Connect / Google Fit inbound — see `spark/android.md` |

### MCP data pipe (works with any MCP client)

```bash
node mcp-server/server.mjs nutri-sync-data.json
```

Point your MCP client at it (see `spark-config.example.json`). Export a JSON backup from the
app and pass it as the data file — the schema is identical.

| Direction | Tool | What Spark can do |
|---|---|---|
| → Spark | `get_profile`, `get_goals`, `get_today_summary`, `get_context` | Read metrics & goals for grounded answers |
| Spark → | `log_meal`, `log_weight` | Write meals and weigh-ins back into NutriSync |

Every MCP write lands in the sync log with the connector name `MCP / Gemini Spark`, so the
two-way path is always auditable.

## How the two-way sync engine works

1. **Outbound**: the app builds a compact context payload (profile, goal, meals, weights, water).
2. **Transport**: pushed to Sheets / downloaded as CSV / JSON / attached to every Gemini request.
3. **Inbound**: pulled data is merged by `id` with last-write-wins (`updatedAt`) — edits from any
   surface converge instead of duplicating.
4. **Audit**: every operation appends to the sync log, newest first.

## Repo layout

```
src/
  pages/         Dashboard · Baseline · Goals · Connectors
  lib/           metrics (BMR/TDEE/targets) · store (persistence) · sync engine · Gemini client
  components/    layout, meal dialog, coach panel
mcp-server/      stdio MCP server for Gemini Spark (zero deps)
sheets-bridge/   Google Apps Script web app for the Sheets connector
```

## License

MIT — see [LICENSE](LICENSE).
