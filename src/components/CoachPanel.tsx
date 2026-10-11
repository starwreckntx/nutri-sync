import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { coachChat, generateMealPlan } from '@/lib/gemini'
import { getState, upsertMeals, logSync, updateConnector, useAppState } from '@/lib/store'
import { macroTargets } from '@/lib/metrics'
import type { Meal } from '@/types'
import { Bot, Send, Sparkles, Trash2 } from 'lucide-react'

interface Turn {
  role: 'user' | 'model'
  text: string
}

export default function CoachPanel() {
  const apiKey = useAppState((s) => s.settings.geminiApiKey)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Connect the Gemini AI Coach on the Connectors page to unlock two-way AI coaching and
        one-click meal plans.
      </div>
    )
  }

  const send = async () => {
    const q = input.trim()
    if (!q || busy) return
    setInput('')
    setError(null)
    const next = [...turns, { role: 'user' as const, text: q }]
    setTurns(next)
    setBusy(true)
    try {
      const reply = await coachChat(apiKey, getState(), turns, q)
      setTurns([...next, { role: 'model', text: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Coach request failed')
    } finally {
      setBusy(false)
    }
  }

  const mealPlan = async () => {
    setBusy(true)
    setError(null)
    try {
      const s = getState()
      const targets = s.profile ? macroTargets(s.profile, s.goal) : { calories: 2000, protein: 120 }
      const meals: Meal[] = await generateMealPlan(apiKey, s, targets)
      upsertMeals(meals)
      logSync({
        direction: 'inbound',
        connector: 'Gemini AI Coach',
        summary: `Meal plan generated (${meals.length} meals) and written to today's log`,
      })
      updateConnector('gemini', { lastSyncAt: Date.now(), statusNote: `Wrote ${meals.length} planned meals` })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Meal plan generation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bot className="h-4 w-4 text-primary" /> Gemini Coach
        </div>
        <Button variant="outline" size="sm" onClick={mealPlan} disabled={busy}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Plan my day
        </Button>
      </div>
      {turns.length > 0 && (
        <ScrollArea className="h-56 rounded-md border bg-muted/30 p-3">
          <div className="space-y-3">
            {turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
                <Badge variant={t.role === 'user' ? 'default' : 'secondary'} className="max-w-full whitespace-pre-wrap text-left font-normal">
                  {t.text}
                </Badge>
              </div>
            ))}
            {busy && <p className="text-xs text-muted-foreground">Thinking…</p>}
          </div>
        </ScrollArea>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything — protein on the go, eating out, plateau busting…"
          className="min-h-9 flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <Button size="icon" onClick={send} disabled={busy || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
        {turns.length > 0 && (
          <Button size="icon" variant="ghost" onClick={() => setTurns([])} aria-label="Clear chat">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
