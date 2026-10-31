import type { ReactNode } from "react";
import type { FieldValues, Path, UseControllerProps } from "react-hook-form";
import { useController } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import FieldHint from "./FieldHint";

interface TextareaFieldProps<TFieldValues extends FieldValues>
  extends UseControllerProps<TFieldValues> {
  label: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  hint?: ReactNode;
  id?: string;
  className?: string;
  placeholder?: string;
}

export default function TextareaField<TFieldValues extends FieldValues>({
  label,
  required = false,
  disabled = false,
  rows = 2,
  maxLength,
  hint,
  id,
  className,
  placeholder,
  ...controllerProps
}: TextareaFieldProps<TFieldValues>) {
  const {
    field,
    fieldState: { error },
  } = useController(controllerProps);

  const inputId = id ?? String(field.name);
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy =
    [error?.message ? errorId : null, hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={inputId}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      <textarea
        id={inputId}
        name={field.name}
        ref={field.ref}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        value={field.value ?? ""}
        onChange={field.onChange}
        onBlur={field.onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="min-h-16 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
      />
      {error?.message ? (
        <p id={errorId} className="text-xs text-destructive">
          {error.message}
        </p>
      ) : null}
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  );
}

export type TextareaFieldName<TFieldValues extends FieldValues> =
  Path<TFieldValues>;
