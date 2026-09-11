import { useMemo, useState, type ReactNode } from "react";
import {
  buildMatchRulesFromForm,
  equalsResolutionLabel,
  matchPlayTypeLabel,
  tournamentFormatLabel,
  type TournamentFormValues,
} from "@/modules/tournaments/types";
import { formatLongDateEs } from "@/lib/dates";
import {
  CATEGORY_LEVELS,
  type CategoryGender,
  type CategoryKind,
  type CategoryLevelCode,
  type EqualsResolution,
  type RulesetPreset,
  type TournamentFormat,
} from "@core-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function defaultTournamentFormValues(
  partial?: Partial<TournamentFormValues>,
): TournamentFormValues {
  return {
    name: "Open Padel Club",
    description: "",
    startDate: "2026-10-01",
    endDate: "2026-10-03",
    dailyStartTime: "10:00",
    dailyEndTime: "22:00",
    format: "GROUPS_ELIMINATION",
    matchPlayType: "STANDARD",
    equalsResolution: "goldenPoint",
    setsToWin: 2,
    tiebreakPoints: 7,
    categoryKind: "level",
    categoryLevel: "6ta",
    categoryGender: "male",
    sumaTarget: null,
    categoryName: "6ta Masculino",
    maxPairs: 16,
    pairsPerGroup: 4,
    qualifyPerGroup: 2,
    ...partial,
  };
}

export function buildCategoryDisplayName(values: TournamentFormValues): string {
  const genderLabel =
    values.categoryGender === "male"
      ? "Masculino"
      : values.categoryGender === "female"
        ? "Femenino"
        : "Mixto";
  if (values.categoryKind === "suma") {
    return `Suma ${values.sumaTarget ?? 12} ${genderLabel}`;
  }
  return `${values.categoryLevel ?? "6ta"} ${genderLabel}`;
}

interface TournamentFormProps {
  initialValues?: Partial<TournamentFormValues>;
  submitLabel: string;
  onSubmit: (values: TournamentFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function TournamentForm({
  initialValues,
  submitLabel,
  onSubmit,
  isSubmitting = false,
}: TournamentFormProps) {
  const [values, setValues] = useState<TournamentFormValues>(() =>
    defaultTournamentFormValues(initialValues),
  );

  const patch = <K extends keyof TournamentFormValues>(
    key: K,
    value: TournamentFormValues[K],
  ) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (
        key === "categoryKind" ||
        key === "categoryLevel" ||
        key === "categoryGender" ||
        key === "sumaTarget"
      ) {
        next.categoryName = buildCategoryDisplayName(next);
      }
      if (key === "matchPlayType") {
        if (value === "QUALITY") next.setsToWin = 1;
        if (value === "STANDARD") next.setsToWin = 2;
      }
      return next;
    });
  };

  const summary = useMemo(() => buildCategoryDisplayName(values), [values]);
  const rulesPreview = useMemo(() => buildMatchRulesFromForm(values), [values]);

  return (
    <form
      className="space-y-6"
      data-testid="tournament-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(values);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <Section title="Información" description="Datos generales y ventana horaria del torneo.">
          <div className="space-y-3">
            <Field label="Nombre" htmlFor="name">
              <Input
                id="name"
                value={values.name}
                onChange={(e) => patch("name", e.target.value)}
              />
            </Field>
            <Field label="Descripción" htmlFor="desc">
              <Input
                id="desc"
                value={values.description}
                onChange={(e) => patch("description", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio" htmlFor="start">
                <Input
                  id="start"
                  type="date"
                  value={values.startDate}
                  onChange={(e) => patch("startDate", e.target.value)}
                />
              </Field>
              <Field label="Fin" htmlFor="end">
                <Input
                  id="end"
                  type="date"
                  value={values.endDate}
                  onChange={(e) => patch("endDate", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horario desde" htmlFor="tstart">
                <Input
                  id="tstart"
                  type="time"
                  value={values.dailyStartTime}
                  onChange={(e) => patch("dailyStartTime", e.target.value)}
                />
              </Field>
              <Field label="Horario hasta" htmlFor="tend">
                <Input
                  id="tend"
                  type="time"
                  value={values.dailyEndTime}
                  onChange={(e) => patch("dailyEndTime", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Categoría" description="Nivel 1ª–8ª o suma (12, 15…), con género.">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Tipo</p>
              {(
                [
                  ["level", "Por nivel (1ª a 8ª)"],
                  ["suma", "Suma (ej. Suma 12 / Suma 15)"],
                ] as const
              ).map(([kind, label]) => (
                <label key={kind} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="categoryKind"
                    checked={values.categoryKind === kind}
                    onChange={() => patch("categoryKind", kind as CategoryKind)}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Género</p>
              {(
                [
                  ["male", "Masculino"],
                  ["female", "Femenino"],
                  ["mixed", "Mixto"],
                ] as const
              ).map(([gender, label]) => (
                <label key={gender} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    checked={values.categoryGender === gender}
                    onChange={() => patch("categoryGender", gender as CategoryGender)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {values.categoryKind === "level" ? (
              <Field label="Nivel" htmlFor="level">
                <select
                  id="level"
                  className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  value={values.categoryLevel ?? "6ta"}
                  onChange={(e) =>
                    patch("categoryLevel", e.target.value as CategoryLevelCode)
                  }
                >
                  {CATEGORY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Suma objetivo" htmlFor="suma">
                <Input
                  id="suma"
                  type="number"
                  min={2}
                  max={16}
                  value={values.sumaTarget ?? 12}
                  onChange={(e) => {
                    patch("categoryLevel", null);
                    patch("sumaTarget", Number(e.target.value));
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ej. Suma 12: 7ma+5ta o dos 6tas. Puede ser mixto.
                </p>
              </Field>
            )}

            <Field label="Nombre visible" htmlFor="catName">
              <Input
                id="catName"
                value={values.categoryName}
                onChange={(e) => patch("categoryName", e.target.value)}
              />
            </Field>
            <Field label="Máximo de parejas" htmlFor="maxPairs">
              <Input
                id="maxPairs"
                type="number"
                value={values.maxPairs}
                onChange={(e) => patch("maxPairs", Number(e.target.value))}
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Formato"
          description="Tipo de partido, estructura del cuadro y clasificación."
          className="md:col-span-2"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Tipo de partido</p>
              {(
                [
                  ["QUALITY", "Quality — 1 set"],
                  ["STANDARD", "Estándar — al mejor de 3 sets"],
                  ["CUSTOM", "Personalizado"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="matchPlayType"
                    checked={values.matchPlayType === value}
                    onChange={() => patch("matchPlayType", value as RulesetPreset)}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">En iguales (40-40)</p>
              {(
                [
                  ["goldenPoint", "Punto de oro"],
                  ["advantage", "Con ventaja (diferencia de 2)"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="equalsResolution"
                    checked={values.equalsResolution === value}
                    onChange={() =>
                      patch("equalsResolution", value as EqualsResolution)
                    }
                  />
                  {label}
                </label>
              ))}
              <p className="text-xs text-muted-foreground">
                En punto de oro, la pareja que resta elige el lado. Con ventaja hay que ganar dos
                puntos seguidos tras iguales.
              </p>
            </div>

            {values.matchPlayType === "CUSTOM" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Sets para ganar el partido" htmlFor="setsToWin">
                  <Input
                    id="setsToWin"
                    type="number"
                    min={1}
                    max={3}
                    value={values.setsToWin}
                    onChange={(e) => patch("setsToWin", Number(e.target.value))}
                  />
                </Field>
                <Field label="Tie-break a (puntos)" htmlFor="tbPoints">
                  <Input
                    id="tbPoints"
                    type="number"
                    min={5}
                    max={15}
                    value={values.tiebreakPoints}
                    onChange={(e) => patch("tiebreakPoints", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Con diferencia de 2 (ej. 7 puntos).
                  </p>
                </Field>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {values.matchPlayType === "QUALITY"
                  ? "Quality: 1 set a 6 juegos; a 6-6 se juega tie-break a 7."
                  : "Estándar: al mejor de 3 sets a 6 juegos; a 6-6 tie-break a 7."}
              </p>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium">Estructura del torneo</p>
              <div className="space-y-2">
                {(
                  [
                    ["GROUPS_ELIMINATION", "Zonas + eliminación"],
                    ["DIRECT_ELIMINATION", "Eliminación directa"],
                    ["ROUND_ROBIN", "Todos contra todos"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="format"
                      checked={values.format === value}
                      onChange={() => patch("format", value as TournamentFormat)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {values.format === "GROUPS_ELIMINATION" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Parejas/zona" htmlFor="ppg">
                    <Input
                      id="ppg"
                      type="number"
                      min={2}
                      value={values.pairsPerGroup}
                      onChange={(e) => patch("pairsPerGroup", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Clasifican" htmlFor="qpg">
                    <Input
                      id="qpg"
                      type="number"
                      min={1}
                      value={values.qualifyPerGroup}
                      onChange={(e) =>
                        patch("qualifyPerGroup", Number(e.target.value))
                      }
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          </div>
        </Section>

        <Section title="Resumen" description="Vista rápida de lo configurado." className="md:col-span-2">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <p>{values.name}</p>
            <p className="text-muted-foreground">{summary}</p>
            <p className="text-muted-foreground">
              {matchPlayTypeLabel(values.matchPlayType)} ·{" "}
              {equalsResolutionLabel(values.equalsResolution)}
              {values.matchPlayType === "CUSTOM"
                ? ` · tie-break a ${rulesPreview.tiebreakPoints}`
                : ""}
            </p>
            <p className="text-muted-foreground">
              {tournamentFormatLabel(values.format)}
              {values.format === "GROUPS_ELIMINATION"
                ? ` · ${Math.max(1, Math.ceil(Math.max(2, values.maxPairs) / Math.max(2, values.pairsPerGroup)))} zonas (según cupo) · ${values.pairsPerGroup}/zona · clasifican ${values.qualifyPerGroup}`
                : ""}
            </p>
            <p className="text-muted-foreground">
              {formatLongDateEs(values.startDate)} → {formatLongDateEs(values.endDate)} ·{" "}
              {values.dailyStartTime}–{values.dailyEndTime}
            </p>
          </div>
        </Section>
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" data-testid="tournament-form-submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4 space-y-4 h-full",
        className,
      )}
    >
      <header className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
