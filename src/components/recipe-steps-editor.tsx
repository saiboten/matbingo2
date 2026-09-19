import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { MAX_STEPS, type StepDraft } from '../lib/recipe-steps'

interface RecipeStepsEditorProps {
  steps: StepDraft[]
  onChange: (steps: StepDraft[]) => void
}

// Write and arrange the preparation steps of a recipe.
export function RecipeStepsEditor({ steps, onChange }: RecipeStepsEditorProps) {
  const update = (index: number, patch: Partial<StepDraft>) =>
    onChange(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)))

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const remove = (index: number) => onChange(steps.filter((_, i) => i !== index))

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen steg ennå.</p>
      ) : (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={index} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <Input
                  value={step.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                  placeholder="Tittel, f.eks. Stek kjøttdeigen"
                  aria-label={`Tittel på steg ${index + 1}`}
                />
              </div>
              <Textarea
                value={step.text}
                onChange={(e) => update(index, { text: e.target.value })}
                placeholder="Hva skal gjøres i dette steget?"
                aria-label={`Beskrivelse av steg ${index + 1}`}
                rows={3}
              />
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                  <span className="sr-only">Flytt opp</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === steps.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                  <span className="sr-only">Flytt ned</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Fjern steg {index + 1}</span>
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Button
        type="button"
        variant="outline"
        disabled={steps.length >= MAX_STEPS}
        onClick={() => onChange([...steps, { title: '', text: '' }])}
      >
        <Plus className="h-4 w-4 mr-2" />
        Legg til steg
      </Button>
    </div>
  )
}
