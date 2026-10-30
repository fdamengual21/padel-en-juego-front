import type { FieldErrors, FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiHttpError } from "@/lib/apiClient";

/** `priceRules[0].startTime` → `priceRules.0.startTime`. */
export function rhfPathFromApiField(field: string): string {
  return field.replace(/\[(\d+)\]/g, ".$1");
}

export function fieldErrorsFromUnknown(
  err: unknown,
): Record<string, string[]> | null {
  if (err instanceof ApiHttpError) return err.errors;
  return null;
}

/** Aplica errores 422 de la API a RHF. Devuelve las rutas, la primera primero. */
export function applyApiFieldErrors<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  errors: Record<string, string[]>,
): Path<TFieldValues>[] {
  const paths: Path<TFieldValues>[] = [];
  for (const [field, messages] of Object.entries(errors)) {
    const message = messages.find((line) => line.trim())?.trim();
    if (!message) continue;
    const path = rhfPathFromApiField(field) as Path<TFieldValues>;
    setError(path, { type: "server", message });
    paths.push(path);
  }
  return paths;
}

export function scrollToFormField(path: string): void {
  const el = document.getElementById(path);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if (el instanceof HTMLElement) el.focus();
}

export function firstErrorPath(errors: FieldErrors): string | null {
  for (const [key, value] of Object.entries(errors)) {
    if (!value || typeof value !== "object") continue;
    if ("message" in value && typeof value.message === "string" && value.message) {
      return key;
    }
    const nested = firstErrorPath(value as FieldErrors);
    if (nested) return `${key}.${nested}`;
  }
  return null;
}
