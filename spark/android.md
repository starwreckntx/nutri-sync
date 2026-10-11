# NutriSync on Android — the phone-side playbook

Spark runs in Google's cloud, so most of the runtime needs nothing from your phone. The phone
is where **input friction dies**: voice logging, push nudges, and health data flowing in. This
is the full set of Android integrations, what's native today, and the safety rules that come
with them.

## 1 · Spark notifications (native)

The Gemini app on Android surfaces Spark's scheduled work: task tabs (Scheduled / Needs input /
In progress / Completed) and notification channels for **Daily brief**, **Scheduled actions**,
and long-running **Responses**. With the schedules in `schedules.md` enabled, your morning
briefing and evening check-in arrive as phone notifications — expand, read, reply.

- Enable in the Gemini app → account menu → Notifications.
- Because runs are approximate, treat notification timing as "around then", not "exactly then".

## 2 · Voice logging via Gemini (lowest-friction intake)

The single biggest adherence lever: say it, don't type it.

1. Long-press power (or say "Hey Google") → Gemini.
2. "Log what I ate: chicken burrito and a big salad."
3. The **nutrisync-scribe** skill estimates macros and writes the meal through the MCP server.
4. Read-back arrives as a notification; correct it by voice if the estimate was off.

Works because Spark holds the skill persistently — you never restate instructions. Works
hands-free in the car, at the stove, at the table.

## 3 · Health data: Health Connect / Google Fit (inbound)

Android's health data home is **Health Connect** (on-device, shared by Fit and third-party
apps). Today, wire it in through the app's Google Fit connector or a manual CSV export from
your tracker; a dedicated Health Connect bridge (direct on-device read with your explicit
permission) is on the roadmap. Either way the data lands in the same sync engine — last write
wins, no duplicates.

## 4 · Android Utilities / notification access (know the risks)

Gemini on Android can act through system agents — including reading and replying to
notifications from any app. Two things to internalize:

- **It's powerful for NutriSync**: "Summarize my day and log dinner from my food-tracking
  notifications" becomes possible.
- **It's an attack surface that was real.** In 2025–2026, researchers (SafeBreach) showed that
  a poisoned notification from WhatsApp/Slack/SMS could make Gemini execute device actions —
  "Fake Context Alignment" bypasses. Google has patched this with content-classifier
  improvements, but the class of bug persists by design: notification text is untrusted input.

**House rules for this repo's runtime:**

1. Never authorize Gemini to act on *instructions found inside notifications* — treat all
   notification text as data, not commands. (This rule is mirrored in both skills' guardrails.)
2. Keep Gemini and Android system components updated.
3. Verbally confirm only what you read on screen — not what you heard when the screen shows
   something else (the muted-link/foreign-language trick).
4. If you don't need notification access for the NutriSync flows above, leave Android
   Utilities' notification permission off. Nothing in `schedules.md` requires it.

## 5 · Optional power-ups

| Want | How |
|---|---|
| Quick-tile / shortcut to log water | Add a Gemini app shortcut: "Log a glass of water" → scribe skill |
| Widget on home screen showing today's totals | The NutriSync web app is installable (PWA) — Add to Home screen from Chrome |
| Sleep/activity context in reviews | Export from your tracker to CSV → CSV Bridge; Health Connect bridge when shipped |

## What runs where

| Capability | Runs on | Needs phone awake? |
|---|---|---|
| Schedules, briefings, reviews, Docs/Gmail/Calendar writes | Spark cloud VMs | No |
| Notifications of scheduled runs | Gemini app push | No (delivered) |
| Voice logging, on-device replies | Phone (Gemini) | Yes, briefly |
| MCP read/write of the data file | Your machine / server hosting `server.mjs` | No, it just needs the process running |
