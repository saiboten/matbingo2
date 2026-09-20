import * as React from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastVariant = 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

const TOAST_DURATION_MS = 3500
const ERROR_TOAST_DURATION_MS = 6000 // errors are often longer and worth reading twice

const ToastContext = React.createContext<((message: string, variant?: ToastVariant) => void) | null>(null)

// Shows short confirmations at the bottom of the screen, e.g. `toast('Kopiert')`
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const nextId = React.useRef(1)

  const toast = React.useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = nextId.current++
    setToasts(prev => [...prev, { id, message, variant }])
    window.setTimeout(
      () => setToasts(prev => prev.filter(item => item.id !== id)),
      variant === 'error' ? ERROR_TOAST_DURATION_MS : TOAST_DURATION_MS
    )
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map(item => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex max-w-md items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2',
              item.variant === 'error'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-primary text-primary-foreground'
            )}
          >
            {item.variant === 'error' ? <X className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const toast = React.useContext(ToastContext)
  if (!toast) throw new Error('useToast must be used inside a ToastProvider')
  return toast
}
