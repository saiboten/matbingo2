export interface StepDraft {
  title: string
  text: string
}

export const MAX_STEPS = 20
const MAX_TITLE_LENGTH = 100
const MAX_TEXT_LENGTH = 1000

// Cleans up steps coming from the editor: trims, drops steps without text, and keeps the
// count and lengths within sane limits.
export function normalizeSteps(input: unknown): StepDraft[] {
  if (!Array.isArray(input)) return []

  const steps: StepDraft[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const { title, text } = item as { title?: unknown; text?: unknown }
    const cleanText = typeof text === 'string' ? text.trim().slice(0, MAX_TEXT_LENGTH) : ''
    if (!cleanText) continue
    steps.push({
      title: typeof title === 'string' ? title.trim().slice(0, MAX_TITLE_LENGTH) : '',
      text: cleanText,
    })
    if (steps.length === MAX_STEPS) break
  }
  return steps
}
