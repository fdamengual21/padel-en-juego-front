import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

/** When the field shows 0, a typed digit replaces it instead of becoming 05 or 50. */
function replaceDefaultZero(previous: string, next: string): string {
  if (previous !== "0") return next
  if (next === "" || next === "0" || next === "00") return next === "" ? "" : "0"
  if (next === "0." || next === "-0.") return next
  if (next.length === 2) {
    const added = next.startsWith("0") ? next[1] : next[0]
    return added === "." ? "0." : added
  }
  return next
}

function selectZeroValue(element: HTMLInputElement) {
  if (element.value === "0") element.select()
}

function Input({
  className,
  type,
  value,
  onChange,
  onFocus,
  onMouseUp,
  ...props
}: React.ComponentProps<"input">) {
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    if (type === "number") selectZeroValue(event.currentTarget)
    onFocus?.(event)
  }

  const handleMouseUp = (event: React.MouseEvent<HTMLInputElement>) => {
    if (type === "number") selectZeroValue(event.currentTarget)
    onMouseUp?.(event)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (type === "number" && value !== undefined && value !== null) {
      const resolved = replaceDefaultZero(String(value), event.target.value)
      if (resolved !== event.target.value) event.target.value = resolved
    }
    onChange?.(event)
  }

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
    />
  )
}

export { Input }
