import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAppState, setState, updateConnector, logSync, upsertMeals } from '@/lib/store'
import {
  buildContextPayload, downloadFile, mealsFromCsv, mealsToCsv, mergeImport,
  runSheetsSync, stateToJson,
} from '@/lib/sync'
import { todayKey } from '@/lib/metrics'
import { toast } from 'sonner'
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Settings2, CheckCircle2, Circle, PlugZap, Sparkles } from 'lucide-react'

export default function Connectors() {
  const connectors = useAppState((s) => s.connectors)
  const syncLog = useAppState((s) => s.syncLog)
  const settings = useAppState((s) => s.settings)
  const meals = useAppState((s) => s.meals)
  const [busyId, setBusyId] = useState<string | null>(null)

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id)
    try {
      await fn()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusyId(null)
    }
  }

  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(new Error('Could not read file'))
      r.readAsText(file)
    })

  const csvInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

  const actions: Record<string, React.ReactNode> = {
    gemini: (
      <GeminiConfig />
    ),
    sheets: (
      <div className="flex flex-wrap gap-2">
        <SheetsConfig />
        <Button
          size="sm"
          variant="outline"
          disabled={!settings.sheetsWebhookUrl || busyId === 'sheets'}
          onClick={() =>
            withBusy('sheets', async () => {
              if (!settings.sheetsWebhookUrl) return
              await runSheetsSync(settings.sheetsWebhookUrl)
              toast.success('Two-way Sheets sync complete')
            })
          }
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busyId === 'sheets' ? 'animate-spin' : ''}`} />
          Sync now
        </Button>
      </div>
    ),
    csv: (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm" variant="outline"
          onClick={() => {
            downloadFile(`nutri-sync-meals-${todayKey()}.csv`, mealsToCsv(meals), 'text/csv')
            logSync({ direction: 'outbound', connector: 'CSV Bridge', summary: `Exported ${meals.length} meals` })
            toast.success('CSV exported')
          }}
        >
          <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" /> Export
        </Button>
        <Button size="sm" variant="outline" onClick={() => csvInput.current?.click()}>
          <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" /> Import
        </Button>
        <input
          ref={csvInput} type="file" accept=".csv" className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            const imported = mealsFromCsv(await readFile(f))
            upsertMeals(imported)
            logSync({ direction: 'inbound', connector: 'CSV Bridge', summary: `Imported ${imported.length} meals` })
            toast.success(`Imported ${imported.length} meals`)
          }}
        />
      </div>
    ),
    json: (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm" variant="outline"
          onClick={() => {
            downloadFile(`nutri-sync-backup-${todayKey()}.json`, stateToJson(), 'application/json')
            logSync({ direction: 'outbound', connector: 'JSON Backup', summary: 'Full snapshot exported' })
            toast.success('Backup downloaded')
          }}
        >
          <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" /> Backup
        </Button>
        <Button size="sm" variant="outline" onClick={() => jsonInput.current?.click()}>
          <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" /> Restore
        </Button>
        <input
          ref={jsonInput} type="file" accept=".json" className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            const r = mergeImport(await readFile(f))
            logSync({
              direction: 'inbound', connector: 'JSON Backup',
              summary: `Restored ${r.meals} meals, ${r.weights} weights, ${r.waterDays} water days`,
            })
            toast.success('Backup merged into local state')
          }}
        />
      </div>
    ),
    'google-fit': (
      <Button
        size="sm" variant="outline"
        onClick={() => toast.info('Configure an OAuth client ID in the connector settings, then authorize in Google Fit.')}
      >
        <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Configure
      </Button>
    ),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <PlugZap className="h-6 w-6 text-primary" /> Connectors
        </h1>
        <p className="text-sm text-muted-foreground">
          Integrative tooling for a two-way path with your whole ecosystem — out to your tools, back into your log,
          with zero copy-paste resistance.
        </p>
      </div>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Spark native mode — default runtime
            </CardTitle>
            <Badge variant="default">3 steps · no local runtime</Badge>
          </div>
          <CardDescription>
            The fastest path: Gemini Spark runs your entire nutrition loop on its own cloud schedule —
            daily briefings, Android voice logging, weekly Doc reviews — using a Google Sheet as the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="grid gap-2 text-sm sm:grid-cols-3">
            <li className="rounded-md border bg-background p-3">
              <span className="font-semibold text-primary">1.</span> Create the{' '}
              <strong>NutriSync Tracker</strong> Google Sheet from{' '}
              <code className="text-xs">spark/templates/sheets-schema.json</code>
            </li>
            <li className="rounded-md border bg-background p-3">
              <span className="font-semibold text-primary">2.</span> Upload the two skills:{' '}
              <code className="text-xs">nutrisync-coach</code> + <code className="text-xs">nutrisync-scribe</code>
            </li>
            <li className="rounded-md border bg-background p-3">
              <span className="font-semibold text-primary">3.</span> Paste the five schedules from{' '}
              <code className="text-xs">spark/schedules-native.md</code>
            </li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <a href="https://github.com/starwreckntx/nutri-sync#quickstart--spark-native-mode-3-steps-no-local-runtime" target="_blank" rel="noreferrer">
                Open quickstart on GitHub
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="https://github.com/starwreckntx/nutri-sync/tree/main/spark" target="_blank" rel="noreferrer">
                Browse spark/ runtime
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {connectors.map((c) => (
          <Card key={c.id} className={c.connected ? '' : 'border-dashed opacity-90'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {c.connected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {c.name}
                </CardTitle>
                <DirectionBadge direction={c.direction} />
              </div>
              <CardDescription>{c.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {c.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {new Date(c.lastSyncAt).toLocaleString()}
                  {c.statusNote ? ` · ${c.statusNote}` : ''}
                </p>
              )}
              {actions[c.id]}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Sync log</h2>
        {syncLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sync activity yet. Every inbound and outbound operation is recorded here — full audit trail,
            bidirectional.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Connector</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLog.slice(0, 20).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(e.time).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.direction === 'inbound' ? 'default' : 'secondary'}>
                        {e.direction === 'inbound' ? '← in' : 'out →'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{e.connector}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <details className="rounded-md border p-4 text-sm">
        <summary className="cursor-pointer font-medium">What the Gemini / Spark context payload looks like</summary>
        <pre className="mt-3 max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
          {JSON.stringify(buildContextPayload(), null, 2).slice(0, 2000)}
        </pre>
      </details>
    </div>
  )
}

function DirectionBadge({ direction }: { direction: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    inbound: { label: '← inbound', variant: 'default' },
    outbound: { label: 'outbound →', variant: 'secondary' },
    bidirectional: { label: '← two-way →', variant: 'default' },
  }
  const m = map[direction] ?? map.outbound
  return <Badge variant={m.variant}>{m.label}</Badge>
}

function GeminiConfig() {
  const settings = useAppState((s) => s.settings)
  const connectors = useAppState((s) => s.connectors)
  const gemini = connectors.find((c) => c.id === 'gemini')
  const [key, setKey] = useState(settings.geminiApiKey ?? '')
  const [open, setOpen] = useState(false)

  const save = () => {
    setState({ settings: { ...settings, geminiApiKey: key.trim() || undefined } })
    updateConnector('gemini', {
      connected: Boolean(key.trim()),
      statusNote: key.trim() ? 'API key configured' : 'Disconnected',
    })
    logSync({
      direction: 'outbound',
      connector: 'Gemini AI Coach',
      summary: key.trim() ? 'Connector configured — context will be sent with each request' : 'Connector disconnected',
    })
    toast.success(key.trim() ? 'Gemini connected' : 'Gemini disconnected')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={gemini?.connected ? 'outline' : 'default'}>
          <Settings2 className="mr-1.5 h-3.5 w-3.5" />
          {gemini?.connected ? 'Manage key' : 'Connect'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gemini AI Coach connection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste a Gemini API key from{' '}
            <a className="text-primary underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              Google AI Studio
            </a>
            . Every coach request carries your baseline, goal and today's log out to Gemini; meal plans and answers
            flow straight back in.
          </p>
          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input type="password" placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <Button className="w-full" onClick={save}>
            {key.trim() ? 'Save & connect' : 'Disconnect'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SheetsConfig() {
  const settings = useAppState((s) => s.settings)
  const connectors = useAppState((s) => s.connectors)
  const sheets = connectors.find((c) => c.id === 'sheets')
  const [url, setUrl] = useState(settings.sheetsWebhookUrl ?? '')
  const [open, setOpen] = useState(false)

  const save = () => {
    setState({ settings: { ...settings, sheetsWebhookUrl: url.trim() || undefined } })
    updateConnector('sheets', {
      connected: Boolean(url.trim()),
      statusNote: url.trim() ? 'Webhook configured' : 'Awaiting webhook URL',
    })
    toast.success(url.trim() ? 'Sheets bridge configured' : 'Sheets bridge cleared')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={sheets?.connected ? 'outline' : 'default'}>
          <Settings2 className="mr-1.5 h-3.5 w-3.5" />
          {sheets?.connected ? 'Webhook set' : 'Set webhook'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Google Sheets bridge</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Deploy the bundled Apps Script (<code className="text-primary">sheets-bridge/Code.gs</code> in this repo)
            as a web app and paste its URL here. NutriSync pushes a full snapshot out, then pulls any rows you or
            Gemini Spark edited back in — last write wins, no duplicates.
          </p>
          <div className="space-y-1.5">
            <Label>Apps Script web app URL</Label>
            <Input placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <Button className="w-full" onClick={save}>
            {url.trim() ? 'Save bridge' : 'Clear bridge'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
