import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addMeal } from '@/lib/store'
import { todayKey } from '@/lib/metrics'
import { Plus } from 'lucide-react'

export default function MealDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  const submit = () => {
    if (!name.trim() || !(Number(calories) > 0)) return
    addMeal({
      name: name.trim(),
      date: todayKey(),
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      source: 'manual',
    })
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('')
    setOpen(false)
  }

  const field = (label: string, value: string, set: (v: string) => void, step = '1') => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min="0" step={step} value={value} onChange={(e) => set(e.target.value)} />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Log meal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a meal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input placeholder="e.g. Grilled chicken bowl" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Calories (kcal)', calories, setCalories)}
            {field('Protein (g)', protein, setProtein)}
            {field('Carbs (g)', carbs, setCarbs)}
            {field('Fat (g)', fat, setFat)}
          </div>
          <Button className="w-full" onClick={submit} disabled={!name.trim() || !(Number(calories) > 0)}>
            Add to today
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
