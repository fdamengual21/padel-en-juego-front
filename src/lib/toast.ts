import { toast as sonnerToast } from "sonner";

/** Feedback de éxito (mutaciones / guardados). */
export function toastSuccess(message: string, description?: string) {
  sonnerToast.success(message, description ? { description } : undefined);
}

/** Feedback de error (fallos de API / validación). */
export function toastError(message: string, description?: string) {
  sonnerToast.error(message, description ? { description } : undefined);
}

/** Info neutra (avisos operativos). */
export function toastInfo(message: string, description?: string) {
  sonnerToast.message(message, description ? { description } : undefined);
}
