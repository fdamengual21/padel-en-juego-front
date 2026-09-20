import {
  CATEGORY_LEVELS,
  formatCategoryLevel,
  type CategoryLevel,
} from "@/domain";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Campos de identidad (registro app o alta manual en club). */
export interface PlayerIdentityValues {
  firstName: string;
  lastName: string;
  age: string;
  email: string;
  categoryLevel: CategoryLevel;
  phone?: string;
}

/**
 * `registration`: todos obligatorios (cuenta app).
 * `club`: solo nombre y apellido obligatorios; resto opcional.
 */
export type PlayerIdentityMode = "registration" | "club";

export function emptyPlayerIdentityValues(
  partial?: Partial<PlayerIdentityValues>,
): PlayerIdentityValues {
  return {
    firstName: "",
    lastName: "",
    age: "",
    email: "",
    categoryLevel: 6,
    phone: "",
    ...partial,
  };
}

/** Alta manual club: solo nombre + apellido. */
export function isClubManualIdentityValid(
  values: Pick<PlayerIdentityValues, "firstName" | "lastName">,
): boolean {
  return Boolean(values.firstName.trim() && values.lastName.trim());
}

/** Registro app: identidad completa. */
export function isRegistrationIdentityValid(
  values: PlayerIdentityValues,
): boolean {
  const age = Number(values.age);
  if (!values.firstName.trim() || !values.lastName.trim()) return false;
  if (!values.email.trim() || !values.email.includes("@")) return false;
  if (!Number.isFinite(age) || age < 12 || age > 99) return false;
  if (!CATEGORY_LEVELS.includes(values.categoryLevel)) return false;
  return true;
}

/** @deprecated Prefer isClubManualIdentityValid / isRegistrationIdentityValid */
export function isPlayerIdentityValid(
  values: PlayerIdentityValues,
  options?: { mode?: PlayerIdentityMode },
): boolean {
  const mode = options?.mode ?? "club";
  return mode === "registration"
    ? isRegistrationIdentityValid(values)
    : isClubManualIdentityValid(values);
}

interface PlayerIdentityFieldsProps {
  values: PlayerIdentityValues;
  onChange: (values: PlayerIdentityValues) => void;
  mode?: PlayerIdentityMode;
  /** Mostrar teléfono. Default true. */
  showPhone?: boolean;
  /** Mostrar edad y categoría. Default true. */
  showAgeAndCategory?: boolean;
  idPrefix?: string;
  className?: string;
}

export default function PlayerIdentityFields({
  values,
  onChange,
  mode = "club",
  showPhone = true,
  showAgeAndCategory = true,
  idPrefix = "identity",
  className,
}: PlayerIdentityFieldsProps) {
  const patch = (partial: Partial<PlayerIdentityValues>) =>
    onChange({ ...values, ...partial });
  const optional = mode === "club";

  const labelSuffix = (required: boolean) =>
    required ? "" : optional ? " (opcional)" : "";

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-firstName`}>Nombre</Label>
        <Input
          id={`${idPrefix}-firstName`}
          value={values.firstName}
          onChange={(e) => patch({ firstName: e.target.value })}
          autoComplete="given-name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-lastName`}>Apellido</Label>
        <Input
          id={`${idPrefix}-lastName`}
          value={values.lastName}
          onChange={(e) => patch({ lastName: e.target.value })}
          autoComplete="family-name"
        />
      </div>
      {showAgeAndCategory ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-age`}>
              Edad{labelSuffix(mode === "registration")}
            </Label>
            <Input
              id={`${idPrefix}-age`}
              type="number"
              min={12}
              max={99}
              value={values.age}
              onChange={(e) => patch({ age: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-category`}>
              Categoría actual{labelSuffix(mode === "registration")}
            </Label>
            <select
              id={`${idPrefix}-category`}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              value={values.categoryLevel}
              onChange={(e) =>
                patch({
                  categoryLevel: Number(e.target.value) as CategoryLevel,
                })
              }
            >
              {CATEGORY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {formatCategoryLevel(level)}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}
      <div
        className={cn(
          "space-y-1.5",
          showPhone ? "sm:col-span-1" : "sm:col-span-2",
        )}
      >
        <Label htmlFor={`${idPrefix}-email`}>
          Email{labelSuffix(mode === "registration")}
        </Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={values.email}
          onChange={(e) => patch({ email: e.target.value })}
          autoComplete="email"
        />
      </div>
      {showPhone ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-phone`}>
            Teléfono{labelSuffix(mode === "registration")}
          </Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            value={values.phone ?? ""}
            onChange={(e) => patch({ phone: e.target.value })}
            autoComplete="tel"
          />
        </div>
      ) : null}
    </div>
  );
}
