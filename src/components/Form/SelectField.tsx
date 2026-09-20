import type { FieldValues, Path, UseControllerProps } from "react-hook-form";
import { useController } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SelectFieldOption {
  value: string;
  label: string;
}

interface SelectFieldProps<TFieldValues extends FieldValues>
  extends UseControllerProps<TFieldValues> {
  label: string;
  options: readonly SelectFieldOption[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  required?: boolean;
  /** Vacío → `null`. Con `number`, el value se parsea. */
  valueAs?: "string" | "number";
  id?: string;
  className?: string;
}

export default function SelectField<TFieldValues extends FieldValues>({
  label,
  options,
  allowEmpty = false,
  emptyLabel = "Seleccionar…",
  disabled = false,
  required = false,
  valueAs = "string",
  id,
  className,
  ...controllerProps
}: SelectFieldProps<TFieldValues>) {
  const {
    field,
    fieldState: { error },
  } = useController(controllerProps);
  const inputId = id ?? String(field.name);
  const stringValue = field.value == null ? "" : String(field.value);

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
      <select
        id={inputId}
        name={field.name}
        ref={field.ref}
        disabled={disabled}
        value={stringValue}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
        onBlur={field.onBlur}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "") {
            field.onChange(null);
            return;
          }
          field.onChange(valueAs === "number" ? Number(raw) : raw);
        }}
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error?.message ? (
        <p id={`${inputId}-error`} className="text-xs text-destructive">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

export type SelectFieldName<TFieldValues extends FieldValues> =
  Path<TFieldValues>;
