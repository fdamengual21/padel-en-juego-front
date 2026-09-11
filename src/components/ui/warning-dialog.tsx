import type { ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface WarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  confirmVariant?: "default" | "destructive"
  isConfirming?: boolean
  confirmDisabled?: boolean
  size?: "default" | "sm"
}

/** Bloquea solo el click fantasma al cerrar, sin dejar el body inutilizable. */
function suppressGhostClick() {
  const stop = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  document.addEventListener("click", stop, true)
  document.addEventListener("pointerup", stop, true)

  window.setTimeout(() => {
    document.removeEventListener("click", stop, true)
    document.removeEventListener("pointerup", stop, true)
    document.body.style.removeProperty("pointer-events")
  }, 50)
}

function unlockPointerEvents() {
  document.body.style.removeProperty("pointer-events")
}

/**
 * Modal de advertencia reutilizable (confirmación).
 * title + description + content opcional + acciones Cancelar / Confirmar.
 */
export default function WarningDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Aceptar",
  cancelLabel = "Cancelar",
  onConfirm,
  confirmVariant = "default",
  isConfirming = false,
  confirmDisabled = false,
  size = "default",
}: WarningDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          suppressGhostClick()
          unlockPointerEvents()
        }
        onOpenChange(next)
      }}
    >
      <AlertDialogContent size={size} data-testid="warning-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {children ? (
          <div data-slot="warning-dialog-content" className="space-y-2">
            {children}
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isConfirming}
            onClick={(e) => {
              e.stopPropagation()
              suppressGhostClick()
            }}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={confirmVariant}
            disabled={isConfirming || confirmDisabled}
            onClick={(e) => {
              e.stopPropagation()
              suppressGhostClick()
              onConfirm()
            }}
          >
            {isConfirming ? "Guardando…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
