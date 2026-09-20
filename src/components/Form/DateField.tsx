import type { ReactNode } from "react";
import type { FieldValues, Path, UseControllerProps } from "react-hook-form";
import { useController } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import FieldHint from "./FieldHint";

interface DateFieldProps<TFieldValues extends FieldValues>
  extends UseControllerProps<TFieldValues> {
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  hint?: ReactNode;
  id?: string;
  className?: string;
}

export default function DateField<TFieldValues extends FieldValues>({
  label,
  required = false,
  disabled = false,
  placeholder,
  minDate,
  maxDate,
  hint,
  id,
  className,
  ...controllerProps
}: DateFieldProps<TFieldValues>) {
  const {
    field,
    fieldState: { error },
  } = useController(controllerProps);
  const inputId = id ?? String(field.name);
  const isoValue =
    typeof field.value === "string" && field.value.trim()
      ? field.value
      : null;

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
      <DatePicker
        id={inputId}
        value={isoValue}
        minDate={minDate}
        maxDate={maxDate}
        placeholder={placeholder}
        disabled={disabled}
        invalid={Boolean(error)}
        allowClear={!required}
        onChange={(next) => field.onChange(next)}
        onBlur={field.onBlur}
      />
      {error?.message ? (
        <p id={`${inputId}-error`} className="text-xs text-destructive">
          {error.message}
        </p>
      ) : hint ? (
        <FieldHint id={`${inputId}-hint`}>{hint}</FieldHint>
      ) : null}
    </div>
  );
}

export type DateFieldName<TFieldValues extends FieldValues> = Path<TFieldValues>;
