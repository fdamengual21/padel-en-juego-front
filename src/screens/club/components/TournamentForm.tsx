import { useMemo, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import {
  buildMatchRulesFromForm,
  defaultPhaseDays,
  enumerateTournamentDays,
  equalsResolutionLabel,
  matchPlayTypeLabel,
  phasesForFormat,
  reconcilePhaseDays,
  countTournamentDays,
  tournamentFormatLabel,
  type TournamentFormValues,
} from "@/modules/tournaments/types";
import { formatLongDateEs, parseIsoDateOnly } from "@/lib/dates";
import {
  CATEGORY_LEVELS,
  formatCategoryLevel,
  type CategoryGender,
  type CategoryKind,
  type CategoryLevel,
  type EqualsResolution,
  type RulesetPreset,
  type TournamentCircuitType,
  type TournamentFormat,
  SCORING_MAX_PAIRS,
  SCORING_MIN_PAIRS,
  clampScoringMaxPairs,
} from "@/domain";
import ScoringTournamentInfoDialog from "@/components/tournaments/ScoringTournamentInfoDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { circuitTypeLabel } from "@/modules/tournaments/types";

function isScoringFormat(format: TournamentFormat): boolean {
  return format === "GROUPS_ELIMINATION" || format === "DIRECT_ELIMINATION";
}

export function defaultTournamentFormValues(
  partial?: Partial<TournamentFormValues>,
): TournamentFormValues {
  const startDate = partial?.startDate ?? "2026-10-01";
  const endDate = partial?.endDate ?? "2026-10-03";
  const requestedFormat = partial?.format ?? "GROUPS_ELIMINATION";
  const { phaseDays, ...rest } = partial ?? {};
  const matchPlayType = rest.matchPlayType ?? "STANDARD";
  const scoring = matchPlayType === "STANDARD";
  const format =
    scoring && !isScoringFormat(requestedFormat) ? "GROUPS_ELIMINATION" : requestedFormat;
  const values: TournamentFormValues = {
    name: "Open Padel Club",
    description: "",
    dailyStartTime: "10:00",
    dailyEndTime: "22:00",
    courtHoldStartTime: "18:00",
    courtHoldEndTime: "22:00",
    courtHoldCourtIds: [],
    registrationFee: 0,
    equalsResolution: "goldenPoint",
    setsToWin: 2,
    tiebreakPoints: 7,
    categoryKind: "level",
    categoryLevel: 6,
    categoryGender: "male",
    sumaTarget: null,
    categoryName: `${formatCategoryLevel(6)} Masculino`,
    maxPairs: scoring ? SCORING_MAX_PAIRS : 16,
    circuitType: "NONE",
    ...rest,
    matchPlayType,
    startDate,
    endDate,
    format,
    phaseDays:
      phaseDays == null || format !== requestedFormat
        ? defaultPhaseDays(format, countTournamentDays(startDate, endDate))
        : phaseDays,
  };
  if (!scoring) return values;
  return {
    ...values,
    equalsResolution: "advantage",
    setsToWin: 2,
    tiebreakPoints: 7,
    maxPairs:
      rest.maxPairs == null ? SCORING_MAX_PAIRS : clampScoringMaxPairs(rest.maxPairs),
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
  return `${formatCategoryLevel(values.categoryLevel ?? 6)} ${genderLabel}`;
}

interface TournamentFormProps {
  initialValues?: Partial<TournamentFormValues>;
  courts?: Array<{ id: string; name: string }>;
  submitLabel: string;
  onSubmit: (values: TournamentFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function TournamentForm({
  initialValues,
  courts = [],
  submitLabel,
  onSubmit,
  isSubmitting = false,
}: TournamentFormProps) {
  const [rulesOpen, setRulesOpen] = useState(false);
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
        if (value === "STANDARD") {
          next.setsToWin = 2;
          next.tiebreakPoints = 7;
          next.equalsResolution = "advantage";
          next.maxPairs = SCORING_MAX_PAIRS;
          if (!isScoringFormat(next.format)) next.format = "GROUPS_ELIMINATION";
        }
      }
      if (
        key === "format" &&
        next.matchPlayType === "STANDARD" &&
        !isScoringFormat(next.format)
      ) {
        next.format = "GROUPS_ELIMINATION";
      }
      if (key === "maxPairs" && next.matchPlayType === "STANDARD" && typeof value === "number") {
        next.maxPairs = clampScoringMaxPairs(value);
      }
      if (key === "format" && next.format === "QUALITY") {
        next.endDate = next.startDate;
      }
      if (key === "startDate" && typeof value === "string" && next.format === "QUALITY") {
        next.endDate = value;
      }
      if (key === "startDate" && typeof value === "string" && next.endDate < value) {
        next.endDate = value;
      }
      if (
        key === "startDate" ||
        key === "endDate" ||
        key === "format" ||
        next.format !== prev.format
      ) {
        next.phaseDays = reconcilePhaseDays(next);
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
            <Field label="Precio de inscripción" htmlFor="registrationFee">
              <Input
                id="registrationFee"
                type="number"
                min={0}
                step={100}
                value={values.registrationFee}
                onChange={(e) =>
                  patch("registrationFee", Math.max(0, Number(e.target.value) || 0))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Monto por pareja (0 = sin cargo / a confirmar).
              </p>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio" htmlFor="start">
                <DatePicker
                  id="start"
                  value={values.startDate}
                  onChange={(next) => {
                    if (next) patch("startDate", next);
                  }}
                />
              </Field>
              <Field label="Fin" htmlFor="end">
                <DatePicker
                  id="end"
                  value={values.format === "QUALITY" ? values.startDate : values.endDate}
                  minDate={values.startDate}
                  disabled={values.format === "QUALITY"}
                  onChange={(next) => {
                    if (next) patch("endDate", next);
                  }}
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
                  value={values.categoryLevel ?? 6}
                  onChange={(e) =>
                    patch(
                      "categoryLevel",
                      Number(e.target.value) as CategoryLevel,
                    )
                  }
                >
                  {CATEGORY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {formatCategoryLevel(level)}
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
                  Ej. Suma 12: {formatCategoryLevel(7)}+{formatCategoryLevel(5)}{" "}
                  o dos {formatCategoryLevel(6)}. Puede ser mixto.
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

            <div className="space-y-2">
              <p className="text-sm font-medium">Circuito de ranking</p>
              {(
                [
                  ["NONE", circuitTypeLabel("NONE")],
                  ["CICUPA", circuitTypeLabel("CICUPA")],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="circuitType"
                    checked={values.circuitType === value}
                    onChange={() =>
                      patch("circuitType", value as TournamentCircuitType)
                    }
                  />
                  {label}
                </label>
              ))}
              <p className="text-xs text-muted-foreground">
                Si hay circuito, al inscribir se puede anotar el snapshot de
                puntos acumulados de cada jugador.
              </p>
            </div>
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
                  ["STANDARD", "Torneo puntuable"],
                  ["CUSTOM", "Personalizado"],
                ] as const
              ).map(([value, label]) => (
                <div key={value} className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="matchPlayType"
                      checked={values.matchPlayType === value}
                      onChange={() => patch("matchPlayType", value as RulesetPreset)}
                    />
                    {label}
                  </label>
                  {value === "STANDARD" && values.matchPlayType === "STANDARD" ? (
                    <Alert variant="info">
                      <Info />
                      <AlertDescription>
                        Este torneo suma al ranking. El mínimo y el máximo de
                        parejas se controlan al inscribir.
                      </AlertDescription>
                      <div className="col-start-2">
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto px-0 text-primary-strong"
                          onClick={() => setRulesOpen(true)}
                        >
                          Ver reglas
                        </Button>
                      </div>
                    </Alert>
                  ) : null}
                </div>
              ))}
            </div>

            <Field label="Máximo de parejas" htmlFor="maxPairs">
              <Input
                id="maxPairs"
                type="number"
                min={values.matchPlayType === "STANDARD" ? SCORING_MIN_PAIRS : 2}
                max={values.matchPlayType === "STANDARD" ? SCORING_MAX_PAIRS : undefined}
                value={values.maxPairs}
                onChange={(e) => patch("maxPairs", Number(e.target.value))}
              />
              {values.matchPlayType === "STANDARD" ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo {SCORING_MIN_PAIRS} parejas. El mínimo y este máximo se
                  controlan al inscribir.
                </p>
              ) : null}
            </Field>

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
                    disabled={values.matchPlayType === "STANDARD"}
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
            ) : values.matchPlayType === "QUALITY" ? (
              <p className="text-xs text-muted-foreground">
                Quality: 1 set a 6 juegos; a 6-6 se juega tie-break a 7.
              </p>
            ) : null}

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium">Estructura del torneo</p>
              <div className="space-y-2">
                {(
                  [
                    ["GROUPS_ELIMINATION", "Zonas + eliminación"],
                    ["DIRECT_ELIMINATION", "Eliminación directa"],
                    ["ROUND_ROBIN", "Todos contra todos"],
                    ["QUALITY", "Quality — un solo día"],
                  ] as const
                ).map(([value, label]) => {
                  const locked =
                    values.matchPlayType === "STANDARD" && !isScoringFormat(value);
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        locked && "cursor-not-allowed text-muted-foreground",
                      )}
                    >
                      <input
                        type="radio"
                        name="format"
                        checked={values.format === value}
                        disabled={locked}
                        onChange={() => patch("format", value as TournamentFormat)}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              {values.format === "QUALITY" ? (
                <div className="space-y-3 rounded-xl border border-border p-3">
                  <p className="text-sm font-medium">Bloqueo de canchas</p>
                  <p className="text-xs text-muted-foreground">
                    Ese rango queda ocupado en la agenda, en las reservas y en los turnos libres.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Desde" htmlFor="hold-start">
                      <Input
                        id="hold-start"
                        type="time"
                        value={values.courtHoldStartTime}
                        onChange={(e) => patch("courtHoldStartTime", e.target.value)}
                      />
                    </Field>
                    <Field label="Hasta" htmlFor="hold-end">
                      <Input
                        id="hold-end"
                        type="time"
                        value={values.courtHoldEndTime}
                        onChange={(e) => patch("courtHoldEndTime", e.target.value)}
                      />
                    </Field>
                  </div>
                  {courts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay canchas activas.</p>
                  ) : (
                    <div className="space-y-2">
                      {courts.map((court) => {
                        const checked = values.courtHoldCourtIds.includes(court.id);
                        return (
                          <label key={court.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const nextIds = checked
                                  ? values.courtHoldCourtIds.filter((id) => id !== court.id)
                                  : [...values.courtHoldCourtIds, court.id];
                                patch("courtHoldCourtIds", nextIds);
                              }}
                            />
                            {court.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
              {values.format === "GROUPS_ELIMINATION" ? (
                <p className="text-sm text-muted-foreground">
                  Zonas de 3. Si sobra una pareja, la zona A queda de 4. Si sobran
                  dos, A y B quedan de 4. De una zona de 3 pasan 2 y de una de 4
                  pasan 3.
                </p>
              ) : null}
            </div>
            {values.matchPlayType !== "QUALITY" && values.format !== "QUALITY" ? (
              <PhaseDayPicker
                values={values}
                onChange={(phase, dayNumber) => {
                  const selected = values.phaseDays[phase] ?? [];
                  const has = selected.includes(dayNumber);
                  if (has && selected.length === 1) return;
                  const nextDays = has
                    ? selected.filter((day) => day !== dayNumber)
                    : [...selected, dayNumber].sort((left, right) => left - right);
                  patch("phaseDays", { ...values.phaseDays, [phase]: nextDays });
                }}
              />
            ) : null}
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
                ? " · zonas de 3, o de 4 si sobran parejas · pasan 2 o 3"
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
      <ScoringTournamentInfoDialog open={rulesOpen} onOpenChange={setRulesOpen} />
    </form>
  );
}

function PhaseDayPicker({
  values,
  onChange,
}: {
  values: TournamentFormValues;
  onChange: (phase: string, dayNumber: number) => void;
}) {
  const days = enumerateTournamentDays(values.startDate, values.endDate);
  const phases = phasesForFormat(values.format);
  if (phases.length === 0 || days.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Días de cada fase</p>
        <p className="text-xs text-muted-foreground">
          El autoasignado de canchas y horarios usa estos días. Una fase puede jugarse en más de uno.
        </p>
      </div>
      {phases.map((phase) => (
        <div key={phase.code} className="space-y-2">
          <p className="text-sm">{phase.label}</p>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => {
              const selected = (values.phaseDays[phase.code] ?? []).includes(day.dayNumber);
              const date = parseIsoDateOnly(day.iso);
              const caption = date
                ? date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                : "";
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(phase.code, day.dayNumber)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground",
                  )}
                >
                  Día {day.dayNumber}
                  {caption ? (
                    <span
                      className={cn(
                        "ml-1.5 text-xs",
                        selected ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {caption}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
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
