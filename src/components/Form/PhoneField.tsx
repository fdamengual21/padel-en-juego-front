import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useController } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PHONE_DIAL_CODES,
  DEFAULT_PHONE_DIAL,
} from "@/lib/phone";
import { cn } from "@/lib/utils";
import FieldHint from "./FieldHint";

interface PhoneFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  dialName: Path<TFieldValues>;
  nationalName: Path<TFieldValues>;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  id?: string;
  className?: string;
}

/** Select de país (+54) + número nacional. Al guardar se unen en un E.164. */
export default function PhoneField<TFieldValues extends FieldValues>({
  control,
  dialName,
  nationalName,
  label = "Teléfono",
  required = false,
  disabled = false,
  hint,
  id,
  className,
}: PhoneFieldProps<TFieldValues>) {
  const dial = useController({ control, name: dialName });
  const national = useController({ control, name: nationalName });
  const inputId = id ?? String(nationalName);
  const dialId = `${inputId}-dial`;
  const error = dial.fieldState.error?.message || national.fieldState.error?.message;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;
  const dialValue =
    dial.field.value == null || dial.field.value === ""
      ? DEFAULT_PHONE_DIAL
      : String(dial.field.value);

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
      <div className="flex gap-2">
        <select
          id={dialId}
          name={dial.field.name}
          ref={dial.field.ref}
          disabled={disabled}
          value={dialValue}
          aria-label="Código de país"
          className="h-8 w-[9.5rem] shrink-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
          onBlur={dial.field.onBlur}
          onChange={(event) => dial.field.onChange(event.target.value)}
        >
          {PHONE_DIAL_CODES.map((option) => (
            <option key={option.iso} value={option.dial}>
              {option.label}
            </option>
          ))}
        </select>
        <Input
          id={inputId}
          name={national.field.name}
          ref={national.field.ref}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          value={national.field.value ?? ""}
          placeholder="11 1234-5678"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onBlur={national.field.onBlur}
          onChange={(event) => national.field.onChange(event.target.value)}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <FieldHint id={`${inputId}-hint`}>{hint}</FieldHint>
      ) : (
        <FieldHint id={`${inputId}-hint`}>
          Sin 0 de área. En Argentina se guarda con 9 de celular (WhatsApp).
        </FieldHint>
      )}
    </div>
  );
}
