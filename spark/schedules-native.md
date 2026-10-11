# NutriSync Native Schedules — Zero-Dependency Cloud Mode

Paste-ready schedule blocks for Gemini Spark that run entirely on Google Workspace primitives —
no local Node.js daemon, no MCP pipe, no machine that needs to stay awake. Storage is the
`NutriSync Tracker` Google Sheet built from `templates/sheets-schema.json`.

> Reminder: scheduled run times are **approximate** (cloud queue; monitors poll periodically).
> Keep each schedule paused until its Task has produced two good manual runs in a row.

---

## 1 · Morning Briefing — daily, 07:00 (`0 7 * * *`)

> Create a schedule called "NutriSync Morning Briefing" that runs every day at 7:00 AM.
> Task: "Using the nutri-sync-coach skill, open my NutriSync Tracker Google Sheet. Read
> yesterday's rows in the Daily Log tab and my Profile & Goals targets. Give me an 8-line
> morning brief: yesterday's calories and protein vs target, any weight change in the Weight
> Log, and my one focus for today."

**Reads:** `Daily Log`, `Weight Log`, `Profile & Goals` · **Writes:** none (returns in task result / notification)

---

## 2 · Evening Check-In — daily, 20:30 (`30 20 * * *`)

> Create a schedule called "NutriSync Evening Check-in" that runs every day at 8:30 PM.
> Task: "Using the nutri-sync-coach skill, read today's rows in the Daily Log tab of my
> NutriSync Tracker. Report calories and protein vs the Profile & Goals targets, what headroom
> is left, and one suggestion for the rest of the evening. If today has no rows yet, ask me
> what I ate so the nutrisync-scribe skill can log it."

**Reads:** `Daily Log`, `Profile & Goals` · **Writes:** none (logging happens via your reply)

---

## 3 · Weigh-In Monitor — daily, 21:00 (`0 21 * * *`, conditional)

> Create a monitor called "NutriSync Weigh-in Reminder" that checks every day at 9:00 PM
> whether the Weight Log tab of my NutriSync Tracker has a row with today's date. If there is
> none, remind me: "No weigh-in today — 10 seconds right now?" If there is, do nothing.

**Reads:** `Weight Log` · **Why a monitor:** fires only when the condition holds — no nagging on days you already weighed in.

---

## 4 · Weekly Review — Mondays, 08:00 (`0 8 * * 1`)

> Create a schedule called "NutriSync Weekly Review" that runs every Monday at 8:00 AM.
> Task: "Using the nutrisync-coach skill, read the last 7 days of the Daily Log and Weight Log
> tabs in my NutriSync Tracker plus my Profile & Goals. Compute average daily calories vs
> target, weight change vs my weekly goal rate, and days logged out of 7. Write the review to
> a Google Doc titled 'NutriSync Review – <Monday's date>' with sections Wins / Watch-outs /
> Adjustments, and give me the link. End with a 1-line verdict: on track / adjust."

**Reads:** `Daily Log`, `Weight Log`, `Profile & Goals` · **Writes:** Google Doc

---

## 5 · Meal-Prep Planner — Sundays, 17:00 (`0 17 * * 0`)

> Create a schedule called "NutriSync Meal Prep" that runs every Sunday at 5:00 PM.
> Task: "Using the nutrisync-coach skill, read my Profile & Goals targets and dietary notes
> from NutriSync Tracker. Plan five weekday dinners that fit my calorie and protein targets.
> Consolidate the shopping list and email it to me with the subject 'NutriSync shopping list',
> and place a 90-minute 'Meal prep' block on my Google Calendar for Sunday evening."

**Reads:** `Profile & Goals` · **Writes:** Gmail, Google Calendar
**Note:** email and calendar events are consequential — Spark will ask you to confirm the first time.

---

## Mode A vs Mode B

| Schedule | Mode A (MCP pipe) | Mode B (this file — native cloud) |
|---|---|---|
| Morning Briefing | `spark/schedules.md` · via `get_context` | Schedule 1 · via `NutriSync Tracker` |
| Evening Check-In | `spark/schedules.md` · via `get_today_summary` | Schedule 2 · via `Daily Log` rows |
| Weigh-In Monitor | `spark/schedules.md` · via MCP poll | Schedule 3 · via `Weight Log` row check |
| Weekly Review | `spark/schedules.md` · Doc via MCP context | Schedule 4 · Doc via Sheet rows |
| Meal-Prep Planner | `spark/schedules.md` · Gmail + Calendar | Schedule 5 · identical, Sheet-fed |

Both modes are valid; **Mode B is the default** — it trades the local file pipe for 24/7 cloud
autonomy. Pick one per schedule to avoid duplicate briefings — or, as the default setup, run
Mode B everywhere and keep the MCP server as the app-side sync bridge.
