# NutriSync Spark Schedules

> **Mode A (optional — MCP pipe).** The blocks below are the MCP-server variants. The **default
> runtime is Mode B: native cloud** — see `schedules-native.md` for the paste-ready blocks that
> run on the `NutriSync Tracker` Google Sheet with zero local dependencies. Use this file only
> when you deliberately want Spark to read and write through the local MCP server
> (`mcp-server/server.mjs`).

Paste-ready Task + Schedule blocks for Gemini Spark. Each block is written so you can copy it
into Spark nearly verbatim; Spark will create the Task, attach the named Skill, and set the
trigger. Adjust times to your day.

> Reminder: scheduled run times are **approximate** (cloud queue, monitors poll periodically).
> Use these for rhythm, not for second-critical alerts. Keep each Schedule paused until its
> Task has produced two good manual runs in a row.

---

## 1 · Morning briefing — every day, 7:00

**What to paste into Spark:**

> Create a schedule called "NutriSync Morning Briefing" that runs every day at 7:00 AM.
> Task: "Using the nutri-sync-coach skill, pull my NutriSync context and give me my morning
> briefing: yesterday's totals vs target, my current weight trend vs goal pace, and my one
> focus for today. Keep it under 8 lines. If I have no plan for today, suggest a default day
> that fits my targets."

**Uses:** MCP `get_context` · **Skill:** `nutrisync-coach`
**Android surface:** appears as a Spark notification (Daily brief) you can expand on your phone.

---

## 2 · Evening check-in — every day, 20:30

> Create a schedule called "NutriSync Evening Check-in" that runs every day at 8:30 PM.
> Task: "Using the nutri-sync-coach skill, review today's NutriSync log. Tell me: calories and
> protein vs target, what's still missing, and one suggestion for the rest of the evening.
> If today has no logged meals yet, ask me what I ate today so I can log it quickly."

**Uses:** MCP `get_today_summary` · **Skill:** `nutrisync-coach`
**Why:** closes the loop — the check-in is the intake moment, so the log never has gaps.

---

## 3 · Weekly review — Mondays, 8:00

> Create a schedule called "NutriSync Weekly Review" that runs every Monday at 8:00 AM.
> Task: "Using the nutri-sync-coach skill, produce my weekly review: weight change vs goal
> pace, average daily calories vs target, adherence (days logged / 7), wins, watch-outs, and
> whether my pace needs adjusting. Write it to a Google Doc titled 'NutriSync Review —
> <week start date>' and give me the link. End with a 1-line verdict: on track / adjust."

**Uses:** MCP `get_context` · Google Docs · **Skill:** `nutrisync-coach`

---

## 4 · Meal-prep planner — Sundays, 17:00

> Create a schedule called "NutriSync Meal Prep" that runs every Sunday at 5:00 PM.
> Task: "Using the nutri-sync-coach skill, look at my goal and dietary notes, then plan five
> weekday dinners that fit my calorie and protein targets. Build a consolidated shopping list,
> email it to me with the subject 'NutriSync shopping list', and put a 90-minute 'Meal prep'
> block on my Google Calendar for Sunday evening."

**Uses:** MCP `get_goals` · Gmail · Calendar · **Skill:** `nutrisync-coach`
**Note:** sending email and creating events are consequential — Spark will ask you to confirm
the first time; approve and let it remember.

---

## 5 · Weigh-in monitor — condition trigger

> Create a monitor called "NutriSync Weigh-in Reminder". Check every evening at 9:00 PM
> whether today's NutriSync data has a weight entry (use get_today_summary / get_context).
> If there is none, remind me: 'No weigh-in today — 10 seconds right now?' Do nothing when
> an entry exists.

**Uses:** MCP `get_today_summary` · **Skill:** `nutrisync-coach`
**Why a monitor, not a schedule:** it fires only when the condition holds — no nagging on days
you already weighed in.

---

## 6 · Optional: delivery-receipt logger — Gmail trigger

> Create a schedule called "NutriSync Order Log" that triggers when a Gmail message from a
> food-delivery service (DoorDash, Uber Eats, Deliveroo, Grubhub) arrives. Task: "Using the
> nutrisync-scribe skill, read the receipt in the email, estimate the meal's macros, and log
> it to NutriSync with source noted as 'gmail receipt'. Then reply to me in the task result
> with the read-back line."

**Uses:** Gmail filter (sender domains of delivery services) · MCP `log_meal` · **Skill:** `nutrisync-scribe`
**Why:** frictionless intake — ordered food logs itself, you just confirm.

---

## Tuning

| If… | Change |
|---|---|
| Briefings feel noisy | Pause schedule 2 / 5 first; keep 1 and 3 |
| Pace adjustments look wrong | Tighten the "compare against goal pace" line in the `nutrisync-coach` skill |
| You want faster logging | Say "log this" from Android and the scribe skill handles it — see `android.md` |
