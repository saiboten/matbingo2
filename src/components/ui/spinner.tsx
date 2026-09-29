import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

// A centered spinner for pages that are waiting for data. The label is read by screen readers only.
function Spinner({ label = "Laster ...", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex justify-center p-8", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export { Spinner }
