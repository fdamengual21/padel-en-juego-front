import { useQuery } from "@tanstack/react-query";
import {
  CATEGORY_LEVELS,
  formatCategoryLevel,
  type CategoryLevel,
} from "@/domain";
import Api from "@/api/Api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Campos de identidad (registro app o alta manual en club). */
export interface PlayerIdentityValues {
  firstName: string;
  lastName: string;
  age: string;
  email: string;
  sexId: number | null;
  categoryLevel: CategoryLevel;
  phone?: string;
}

/**
 * `registration`: todos obligatorios (cuenta app).
 * `club`: nombre, apellido, email y sexo obligatorios; resto opcional.
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
    sexId: null,
    categoryLevel: 6,
    phone: "",
    ...partial,
  };
}

/** Alta manual club: nombre, apellido, email y sexo. */
export function isClubManualIdentityValid(
  values: Pick<PlayerIdentityValues, "firstName" | "lastName" | "email" | "sexId">,
): boolean {
  return Boolean(
    values.firstName.trim() &&
      values.lastName.trim() &&
      values.email.trim().includes("@") &&
      values.sexId != null &&
      values.sexId > 0,
  );
}

/** Registro app: identidad completa. */
export function isRegistrationIdentityValid(
  values: PlayerIdentityValues,
): boolean {
  const age = Number(values.age);
  if (!isClubManualIdentityValid(values)) return false;
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

  const { data: sexes, isLoading: sexesLoading, isError: sexesError } = useQuery({
    queryKey: ["sexes"],
    queryFn: () => Api.SexService().list(),
  });

  const labelSuffix = (required: boolean) =>
    required ? "" : optional ? " (opcional)" : "";

  const requiredMark = (required: boolean) =>
    required ? (
      <span className="text-destructive" aria-hidden>
        *
      </span>
    ) : null;

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-firstName`}>
          Nombre
          {requiredMark(true)}
        </Label>
        <Input
          id={`${idPrefix}-firstName`}
          value={values.firstName}
          onChange={(e) => patch({ firstName: e.target.value })}
          autoComplete="given-name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-lastName`}>
          Apellido
          {requiredMark(true)}
        </Label>
        <Input
          id={`${idPrefix}-lastName`}
          value={values.lastName}
          onChange={(e) => patch({ lastName: e.target.value })}
          autoComplete="family-name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-email`}>
          Email
          {requiredMark(true)}
        </Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={values.email}
          onChange={(e) => patch({ email: e.target.value })}
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-sex`}>
          Sexo
          {requiredMark(true)}
        </Label>
        <select
          id={`${idPrefix}-sex`}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          value={values.sexId ?? ""}
          disabled={sexesLoading || sexesError || !sexes?.length}
          onChange={(e) =>
            patch({
              sexId: e.target.value ? Number(e.target.value) : null,
            })
          }
        >
          <option value="">
            {sexesLoading
              ? "Cargando…"
              : sexesError
                ? "No se pudo cargar"
                : "Seleccioná…"}
          </option>
          {(sexes ?? []).map((sex) => (
            <option key={sex.id} value={sex.id}>
              {sex.name}
            </option>
          ))}
        </select>
      </div>
      {showAgeAndCategory ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-age`}>
              Edad{labelSuffix(mode === "registration")}
              {requiredMark(mode === "registration")}
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
              {requiredMark(mode === "registration")}
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
      {showPhone ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-phone`}>
            Teléfono{labelSuffix(mode === "registration")}
            {requiredMark(mode === "registration")}
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
