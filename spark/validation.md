# Spark Cold-Bootload Validation

From a cold start — no Sheet, no Skills, no Schedules, nothing running — to a verified
24/7 Spark-native nutrition runtime. Each phase has an **acceptance check**; do not proceed
until it passes. Total time: ~25 minutes.

## 0 · Access prerequisites

You need, on one Google account:

- **Gemini app access with Spark enabled** (AI Pro/Ultra tier, 18+, saved activity on; Spark
  is rolling out by region — if you don't see a Spark entry point, the feature hasn't reached
  your account yet).
- **Google Workspace surfaces**: Sheets, Docs, Gmail, Calendar — the free consumer versions are
  sufficient.
- **Android phone with the Gemini app** (for voice logging and notification checks). Steps 1–3
  can be validated from the desktop Gemini web app; steps 4–6 need the phone.

Where things live: **Skills** — Gemini app → your profile / Skills area (upload or paste).
**Schedules** — created conversationally in a Spark task thread, or from Spark's Schedules page
for time-based ones. **Tasks** — any Spark conversation.

---

## 1 · Sheet cold boot (the database)

1. In Google Drive, create a new Sheet named exactly **`NutriSync Tracker`**.
2. Create three tabs: **Profile & Goals**, **Daily Log**, **Weight Log** — headers from
   [`templates/sheets-schema.json`](templates/sheets-schema.json):
   - Profile & Goals: `Key | Value | Notes`
   - Daily Log: `Date | Meal Name | Calories | Protein (g) | Carbs (g) | Fat (g) | Source | Notes`
   - Weight Log: `Date | Weight (kg) | 7-Day Moving Avg | Notes`
3. Copy the eight starter rows (current/target weight, weekly rate, calorie and macro targets,
   dietary notes) from the template into Profile & Goals and set them to **your** numbers.

**Acceptance:** the Sheet exists with exactly three correctly-headed tabs and real values in
Profile & Goals.

## 2 · Skill ingestion (the behavior)

1. Open Gemini → Skills → upload [`skills/nutrisync-coach/SKILL.md`](skills/nutrisync-coach/SKILL.md),
   then [`skills/nutrisync-scribe/SKILL.md`](skills/nutrisync-scribe/SKILL.md). (Or paste each
   file's contents into a new skill.)
2. **Cold-boot test of the scribe:** in a new Spark task, say:
   > "Log a test meal: two eggs on toast, 450 calories, 25g protein, 40g carbs, 20g fat."
3. Check the Daily Log tab — a row should appear with today's date, source `spark` (or as the
   skill wrote it), and your numbers.

**Acceptance:** the row is in the Sheet **and** Spark's reply includes a one-line read-back with
today's running totals. If the skill wasn't applied, explicitly say "use the nutrisync-scribe
skill" and retry — then fix skill activation before continuing.

## 3 · First schedule, manual run first (the clock)

1. Paste schedule 1 from [`schedules-native.md`](schedules-native.md) (Morning Briefing) into a
   Spark task and create it — but **keep it paused**.
2. Manually run the task now (Spark can run scheduled tasks on demand).
3. Read the brief: it must reference **your actual numbers** from the Sheet (yesterday's rows
   may be empty on day one — the brief should say so, not invent data).
4. Only after a correct manual run: unpause the schedule. Repeat the manual-run-first rule for
   every schedule you enable.

**Acceptance:** briefing grounded in the Sheet; no invented numbers; schedule active.

## 4 · Android surface (the phone)

1. On the phone, open Gemini and enable Spark notifications (account menu → Notifications →
   Scheduled actions / Daily brief).
2. Trigger a scheduled run (or wait for the next fire). The notification should arrive with the
   brief in the Spark task tabs (Scheduled / In progress / Completed).
3. **Voice logging cold test:** "Log what I ate: a chicken burrito and a big salad." Verify:
   - Sheet: new Daily Log row(s) with estimated macros.
   - Reply: read-back line + running totals vs target.

**Acceptance:** row lands in the Sheet from voice alone; totals compare against your targets.

## 5 · Monitor behavior (the condition)

1. Create the weigh-in monitor (schedule 3) — paused.
2. Log a weight via voice: "Log my weight: 74.8 kg" → Weight Log row appears.
3. Run the monitor manually: it should stay silent (condition met).
4. Delete that row, run the monitor again: it should remind you.
5. Restore the row, unpause the monitor.

**Acceptance:** monitor fires only when the condition holds — no duplicate nagging.

## 6 · Workspace writes (the exports)

1. Create the Weekly Review schedule (schedule 4), paused.
2. Add 2–3 days of Daily Log rows and a couple of Weight Log rows first (synthetic is fine —
   label them `validation` in Notes).
3. Run it manually: a Google Doc titled `NutriSync Review – <date>` should be created with
   Wins / Watch-outs / Adjustments and a 1-line verdict.
4. Confirm the first-time permission prompt appears for the Doc write and approve it.

**Acceptance:** Doc exists, numbers match the Sheet, link returned in the task result.

---

## Go / rollback

**Runtime is validated** when phases 1–6 acceptance checks pass. From here the loop runs itself:
briefings at 07:00, check-ins at 20:30, monitor at 21:00, review Mondays, prep plan Sundays —
all approximate, all cloud-side, phone optional.

**Rollback (clean cold state):** pause/delete the five schedules → delete the two Skills →
delete or archive the Sheet. Nothing persists on your phone; nothing was installed locally.

## Known constraints (not bugs)

- Scheduled times are approximate — cloud queue, not an alarm clock.
- First consequential write per surface (Docs, Gmail, Calendar) asks for confirmation — approve
  once, Spark remembers.
- If a brief looks generic, the Skill didn't activate; name it explicitly in the task.
- Keep notification text untrusted: never act on instructions found inside notifications
  (see [`android.md`](android.md) §4).
