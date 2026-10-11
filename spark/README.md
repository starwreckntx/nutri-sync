# NutriSync Spark Runtime

NutriSync doesn't just *connect to* Gemini Spark — it ships everything Spark needs to **be** the
nutrition runtime: Spark supplies the scheduling engine, the Google-ecosystem access and the
Android presence; this folder supplies the Skills, Schedules and MCP wiring that turn Spark into
an always-on nutrition agent that works while your devices are off.

## Architecture

```
┌────────────────────────── Gemini Spark (cloud, 24/7) ──────────────────────────┐
│                                                                                 │
│  Schedules (when)          Skills (how)                Connected apps (where)   │
│  ├── Morning briefing  ──► ├── nutrisync-coach  ──────► ├── NutriSync MCP      │
│  ├── Evening check-in  ──► ├── nutrisync-scribe ──────► ├── Google Sheets      │
│  ├── Weekly review     ──► │   (guardrails, format) ──► ├── Gmail / Calendar   │
│  └── Meal-prep planner ──► │                          ──► └── Android (Gemini)  │
│                                                                                 │
└───────────────────────────  device can be off ─────────────────────────────────┘
```

Spark's own model applies cleanly here: **Task = what, Skill = how, Schedule = when**. The
components in this folder follow that separation, so you can change a run time without touching
instructions, and vice versa.

| Piece | File | Role |
|---|---|---|
| Coach Skill | `skills/nutrisync-coach/SKILL.md` | Grounded answers + weekly reviews from your real data |
| Scribe Skill | `skills/nutrisync-scribe/SKILL.md` | Natural-language meal logging through Spark |
| Schedules (MCP mode) | `schedules.md` | Paste-ready daily / weekly / monitor triggers |
| Schedules (native cloud) | `schedules-native.md` | Same triggers, zero-dependency Workspace primitives |
| Sheet templates | `templates/` | `NutriSync Tracker` schema + starter CSV for native mode |
| MCP wiring | `../mcp-server/server.mjs` | The two-way data pipe Spark reads and writes |
| Android playbook | `android.md` | Phone-side integrations, notifications, safety |

## Two runtimes, one skill set

The skills and schedules are **dual-mode**. Choose per workflow — or run native cloud everywhere
and keep the MCP server as the app-side sync bridge.

| Feature | Mode A: Local MCP Pipe | Mode B: Native Cloud (Zero-Dep) |
|---|---|---|
| Storage | Local `nutri-sync-data.json` | Cloud Google Sheet (`NutriSync Tracker`) |
| Runtime requirements | Node.js host process (`server.mjs`) | None (native Gemini Workspace tools) |
| Uptime / availability | Machine must be awake | 24/7 autonomous cloud availability |
| Phone voice logging | Calls local MCP pipe via bridge | Calls Google Sheets append directly |
| Setup time | ~10 mins (config, stdio, tokens) | ~2 mins (create Sheet from `templates/`, upload Skills) |

Mode B setup: create a Sheet named **NutriSync Tracker** with the three tabs defined in
`templates/sheets-schema.json` (or import `templates/nutrisync-tracker-template.csv`), upload the
two Skills, then paste the blocks from `schedules-native.md`.

## Setup (10 minutes)

1. **MCP first.** Run `node mcp-server/server.mjs nutri-sync-data.json` (or point it at a JSON
   backup exported from the app) and register it with Spark per `../spark-config.example.json`.
2. **Skills.** In Gemini → Skills, upload both files under `skills/` (or paste their contents
   into a new skill). Spark applies them automatically when relevant.
3. **Schedules.** Open `schedules.md`, copy each block into Spark, and confirm. Time-based
   schedules can also be built by hand from Spark's Schedules page.
4. **Google access.** Grant Spark the Workspace surfaces each schedule actually needs
   (Sheets, Gmail, Calendar) — nothing more.

## Operating rules (baked into every Skill)

- Spark may **read** freely; it must **ask before writing** anything consequential.
- Numbers come from the connected data source only (MCP tools or the NutriSync Tracker Sheet) — never invented.
- Scheduled times are approximate (cloud queue); nothing here is time-critical or safety-critical.
- No passwords, payment details or sensitive data in Skills or Tasks.

See `android.md` for phone-side behavior — including the notification-injection hardening rules
you should know about before letting Gemini read notifications on Android.
