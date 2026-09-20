import { useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { FieldValues, Path, UseControllerProps } from "react-hook-form";
import { useController } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FieldHint from "./FieldHint";

interface InputFieldProps<TFieldValues extends FieldValues>
  extends UseControllerProps<TFieldValues> {
  label: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "time" | "url";
  autoComplete?: string;
  /**
   * Asterisco en el label. La obligatoriedad se valida con yup/RHF;
   * no se usa el atributo HTML `required`.
   */
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  hint?: ReactNode;
  showHelperText?: boolean;
  id?: string;
  className?: string;
  onValueChange?: (value: string) => void;
}

export default function InputField<TFieldValues extends FieldValues>({
  label,
  type = "text",
  autoComplete,
  required = false,
  disabled = false,
  readOnly = false,
  min,
  max,
  inputMode,
  hint,
  showHelperText = true,
  id,
  className,
  onValueChange,
  ...controllerProps
}: InputFieldProps<TFieldValues>) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    field,
    fieldState: { error },
  } = useController(controllerProps);

  const isPasswordType = type === "password";
  const resolvedType = isPasswordType
    ? isPasswordVisible
      ? "text"
      : "password"
    : type;
  const inputId = id ?? String(field.name);
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (type === "number") {
      field.onChange(next === "" ? null : Number(next));
    } else {
      field.onChange(next);
    }
    onValueChange?.(next);
  };

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
      <div className="relative">
        <Input
          id={inputId}
          name={field.name}
          ref={field.ref}
          type={resolvedType}
          autoComplete={autoComplete}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          inputMode={inputMode}
          value={field.value ?? ""}
          onChange={handleChange}
          onBlur={field.onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(isPasswordType && !readOnly && "pr-9")}
        />
        {isPasswordType && !readOnly ? (
          <button
            type="button"
            disabled={disabled}
            className="absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
            aria-label={
              isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            data-testid={`${inputId}-toggle-password`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setIsPasswordVisible((prev) => !prev)}
          >
            {isPasswordVisible ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        ) : null}
      </div>
      {showHelperText && error?.message ? (
        <p id={`${inputId}-error`} className="text-xs text-destructive">
          {error.message}
        </p>
      ) : hint ? (
        <FieldHint id={`${inputId}-hint`}>{hint}</FieldHint>
      ) : null}
    </div>
  );
}

export type InputFieldName<TFieldValues extends FieldValues> =
  Path<TFieldValues>;
