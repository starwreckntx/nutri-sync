/**
 * NutriSync Google Sheets bridge — Apps Script web app.
 *
 * Deploy:
 *   1. Create a new Google Sheet (or use an existing one).
 *   2. Extensions → Apps Script, paste this file, save.
 *   3. Deploy → New deployment → Web app.
 *        Execute as: Me
 *        Who has access: Anyone (or Anyone with Google account)
 *   4. Copy the /exec URL into NutriSync → Connectors → Google Sheets Bridge.
 *
 * Protocol (JSON over POST):
 *   { action: 'push', payload: <NutriSync state> }   → writes a snapshot tab
 *   { action: 'pull' }                               → returns { meals, weights }
 *                                                     edited via the Sheets UI,
 *                                                     merged last-write-wins.
 */

function doPost(e) {
  const req = JSON.parse(e.postData.contents || '{}')
  if (req.action === 'push') return respond(push_(req.payload))
  if (req.action === 'pull') return respond(pull_())
  return respond({ error: 'unknown action' })
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function sheet_(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sh = ss.getSheetByName(name)
  if (!sh) {
    sh = ss.insertSheet(name)
    sh.getRange(1, 1, 1, header.length).setValues([header])
    sh.setFrozenRows(1)
  }
  return sh
}

function push_(payload) {
  // Snapshot tab: one row per meal
  const mealsSh = sheet_('NutriSync Meals', ['id', 'date', 'name', 'calories', 'protein', 'carbs', 'fat', 'source', 'updatedAt'])
  const meals = payload.meals || []
  mealsSh.clearContents()
  mealsSh.getRange(1, 1, 1, 9).setValues([['id', 'date', 'name', 'calories', 'protein', 'carbs', 'fat', 'source', 'updatedAt']])
  if (meals.length) {
    mealsSh.getRange(2, 1, meals.length, 9).setValues(
      meals.map((m) => [m.id, m.date, m.name, m.calories, m.protein, m.carbs, m.fat, m.source, m.updatedAt]),
    )
  }
  // Summary tab: profile + goal + totals (what a human or Spark edits come back via pull)
  const sumSh = sheet_('NutriSync Summary', ['key', 'value'])
  sumSh.clearContents()
  sumSh.getRange(1, 1, 1, 2).setValues([['key', 'value']])
  const rows = [
    ['exportedAt', new Date().toISOString()],
    ['profile', JSON.stringify(payload.profile || null)],
    ['goal', JSON.stringify(payload.goal || null)],
    ['weights', JSON.stringify(payload.weights || [])],
  ]
  sumSh.getRange(2, 1, rows.length, 2).setValues(rows)
  return { ok: true, meals: meals.length }
}

function pull_() {
  // Anything a user edits directly in the sheet comes back to the app.
  const mealsSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NutriSync Meals')
  const meals = []
  if (mealsSh) {
    const values = mealsSh.getDataRange().getValues()
    const header = values[0]
    const idx = (n) => header.indexOf(n)
    for (const row of values.slice(1)) {
      if (!row[idx('id')]) continue
      meals.push({
        id: String(row[idx('id')]),
        date: String(row[idx('date')]).slice(0, 10),
        name: String(row[idx('name')]),
        calories: Number(row[idx('calories')]) || 0,
        protein: Number(row[idx('protein')]) || 0,
        carbs: Number(row[idx('carbs')]) || 0,
        fat: Number(row[idx('fat')]) || 0,
        source: 'sheets',
        updatedAt: Number(row[idx('updatedAt')]) || Date.now(),
      })
    }
  }
  const sumSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NutriSync Summary')
  let weights = []
  if (sumSh) {
    const values = sumSh.getDataRange().getValues()
    for (const row of values.slice(1)) {
      if (row[0] === 'weights') {
        try {
          weights = JSON.parse(row[1]) || []
        } catch {
          /* ignore malformed cell */
        }
      }
    }
  }
  return { meals, weights }
}
