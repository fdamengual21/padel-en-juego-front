import { useMemo, useState, type ReactNode } from "react";
import { Info, Loader2 } from "lucide-react";
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
  type TournamentBannerDraft,
  type TournamentFormValues,
} from "@/modules/tournaments/types";
import {
  standaloneTournamentFlow,
  type TournamentFormPolicy,
} from "@/modules/tournaments/flows";
import { formatLongDateEs, parseIsoDateOnly, toIsoDateOnly } from "@/lib/dates";
import { toastError } from "@/lib/toast";
import {
  CATEGORY_LEVELS,
  formatCategoryLevel,
  type CategoryGender,
  type CategoryKind,
  type CategoryLevel,
  type TournamentFormat,
  asTournamentFormat,
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
import MatchFormatFields from "./MatchFormatFields";
import TournamentBannerField from "./TournamentBannerField";

function isoPlusDays(iso: string, days: number): string {
  const date = parseIsoDateOnly(iso);
  if (!date) return iso;
  return toIsoDateOnly(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

function isScoringFormat(format: TournamentFormat): boolean {
  return format === "GROUPS_ELIMINATION" || format === "DIRECT_ELIMINATION";
}

export function defaultTournamentFormValues(
  partial?: Partial<TournamentFormValues>,
): TournamentFormValues {
  const today = toIsoDateOnly(new Date());
  const startDate = partial?.startDate ?? today;
  const endDate = partial?.endDate ?? isoPlusDays(startDate, 2);
  const requestedFormat = asTournamentFormat(partial?.format);
  const { phaseDays, ...rest } = partial ?? {};
  const matchPlayType = rest.matchPlayType ?? "QUALITY";
  const scoring = matchPlayType === "STANDARD";
  const format =
    scoring && !isScoringFormat(requestedFormat) ? "GROUPS_ELIMINATION" : requestedFormat;
  const values: TournamentFormValues = {
    name: "",
    description: "",
    dailyStartTime: "10:00",
    dailyEndTime: "",
    registrationFee: 0,
    equalsResolution: "goldenPoint",
    setsToWin: matchPlayType === "QUALITY" ? 1 : 2,
    tiebreakPoints: 7,
    categoryKind: "level",
    categoryLevel: 6,
    categoryGender: "male",
    sumaTarget: null,
    categoryName: `${formatCategoryLevel(6)} Masculino`,
    maxPairs: scoring ? SCORING_MAX_PAIRS : 12,
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
  bannerUrl?: string | null;
  courts?: Array<{ id: string; name: string }>;
  submitLabel: string;
  onSubmit: (
    values: TournamentFormValues,
    banner: TournamentBannerDraft,
  ) => Promise<void> | void;
  isSubmitting?: boolean;
  /** Torneo finalizado/cancelado: se ve la config, no se edita. */
  readOnly?: boolean;
  /** Qué se bloquea y cómo se valida. Torneo suelto por defecto. */
  policy?: TournamentFormPolicy;
}

export default function TournamentForm({
  initialValues,
  bannerUrl = null,
  submitLabel,
  onSubmit,
  isSubmitting = false,
  readOnly = false,
  policy = standaloneTournamentFlow.form,
}: TournamentFormProps) {
  const categoryLocked = readOnly || policy.lockCategory;
  const matchPlayTypeLocked = readOnly || policy.lockMatchPlayType;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [values, setValues] = useState<TournamentFormValues>(() =>
    defaultTournamentFormValues(initialValues),
  );
  const [savedDates] = useState(() => ({
    startDate: values.startDate,
    endDate: values.endDate,
  }));

  const patch = <K extends keyof TournamentFormValues>(
    key: K,
    value: TournamentFormValues[K],
  ) => {
    if (readOnly) return;
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
        if (value === "QUALITY") {
          next.setsToWin = 1;
          next.maxPairs = 12;
        }
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
      if (
        key === "startDate" &&
        typeof value === "string" &&
        (policy.singleDay || next.endDate < value)
      ) {
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
  const today = useMemo(() => toIsoDateOnly(new Date()), []);
  const endDateShown = values.endDate;
  const startDateInvalid = values.startDate !== savedDates.startDate && values.startDate < today;
  const endDateInvalid = endDateShown !== savedDates.endDate && endDateShown < today;
  const datesInvalid = startDateInvalid || endDateInvalid;
  const nameInvalid = !values.name.trim();
  const endMinDate = values.startDate > today ? values.startDate : today;

  return (
    <form
      className="space-y-6"
      data-testid="tournament-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (readOnly) return;
        if (!values.name.trim()) {
          toastError("Ingresá el nombre del torneo");
          return;
        }
        if (
          (values.startDate !== savedDates.startDate && values.startDate < today) ||
          (values.endDate !== savedDates.endDate && values.endDate < today)
        ) {
          toastError(
            "La fecha no puede ser anterior a hoy",
            "Elegí el día de hoy o uno posterior.",
          );
          return;
        }
        const issue = policy.validate(values);
        if (issue) {
          toastError(issue.title, issue.detail);
          return;
        }
        void onSubmit(values, { file: bannerFile, remove: removeBanner });
      }}
    >
      <fieldset
        disabled={readOnly}
        className="m-0 grid min-w-0 gap-4 border-0 p-0 md:grid-cols-2 md:gap-5 disabled:opacity-100"
      >
        <Section title="Información" description="Datos generales y ventana horaria del torneo.">
          <div className="space-y-3">
            <Field label="Nombre" htmlFor="name">
              <Input
                id="name"
                value={values.name}
                disabled={readOnly}
                placeholder="Nombre del torneo"
                onChange={(e) => patch("name", e.target.value)}
              />
            </Field>
            <Field label="Descripción" htmlFor="desc">
              <Input
                id="desc"
                value={values.description}
                disabled={readOnly}
                onChange={(e) => patch("description", e.target.value)}
              />
            </Field>
            <TournamentBannerField
              bannerUrl={bannerUrl}
              file={bannerFile}
              remove={removeBanner}
              readOnly={readOnly}
              onFileSelect={(file) => {
                setBannerFile(file);
                setRemoveBanner(false);
              }}
              onRemove={() => {
                setBannerFile(null);
                setRemoveBanner(true);
              }}
            />
            <Field label="Precio de inscripción" htmlFor="registrationFee">
              <Input
                id="registrationFee"
                type="number"
                min={0}
                step={100}
                value={values.registrationFee}
                disabled={readOnly}
                onChange={(e) =>
                  patch("registrationFee", Math.max(0, Number(e.target.value) || 0))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Monto por pareja (0 = sin cargo / a confirmar).
              </p>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={policy.singleDay ? "Fecha" : "Inicio"}
                htmlFor="start"
                className={policy.singleDay ? "col-span-2" : undefined}
              >
                <DatePicker
                  id="start"
                  value={values.startDate}
                  minDate={today}
                  invalid={startDateInvalid}
                  disabled={readOnly}
                  onChange={(next) => {
                    if (next && next >= today) patch("startDate", next);
                  }}
                />
              </Field>
              {policy.singleDay ? null : (
                <Field label="Fin" htmlFor="end">
                  <DatePicker
                    id="end"
                    value={values.endDate}
                    minDate={endMinDate}
                    invalid={endDateInvalid}
                    disabled={readOnly}
                    onChange={(next) => {
                      if (next && next >= today) patch("endDate", next);
                    }}
                  />
                </Field>
              )}
              {datesInvalid ? (
                <p className="col-span-2 text-xs text-destructive">
                  La fecha no puede ser anterior a hoy.
                </p>
              ) : null}
            </div>
            <Field label="Horario desde" htmlFor="tstart">
              <Input
                id="tstart"
                type="time"
                value={values.dailyStartTime}
                disabled={readOnly}
                onChange={(e) => patch("dailyStartTime", e.target.value)}
              />
              {values.matchPlayType === "QUALITY" ? null : (
                <p className="mt-1 text-xs text-muted-foreground">
                  El autoasignado usa este inicio y el cierre del club.
                </p>
              )}
            </Field>
          </div>
        </Section>

        <Section title="Categoría" description="Nivel 1ª–8ª o suma (12, 15…), con género.">
          <div className="space-y-4">
            {policy.lockCategory && policy.lockedHint ? (
              <p className="text-xs text-muted-foreground">{policy.lockedHint}</p>
            ) : null}
            <div className="space-y-2">
              <p className="text-sm font-medium">Tipo</p>
              {(
                [
                  ["level", "Por nivel (1ª a 8ª)"],
                  ["suma", "Suma (ej. Suma 12 / Suma 15)"],
                ] as const
              ).map(([kind, label]) => (
                <label
                  key={kind}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    categoryLocked && "cursor-not-allowed text-muted-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="categoryKind"
                    checked={values.categoryKind === kind}
                    disabled={categoryLocked}
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
                <label
                  key={gender}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    categoryLocked && "cursor-not-allowed text-muted-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="gender"
                    checked={values.categoryGender === gender}
                    disabled={categoryLocked}
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
                  className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  value={values.categoryLevel ?? 6}
                  disabled={categoryLocked}
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
                  disabled={categoryLocked}
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
                disabled={categoryLocked}
                onChange={(e) => patch("categoryName", e.target.value)}
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
            {(policy.lockMatchPlayType || policy.lockFormat) && policy.lockedHint ? (
              <p className="text-xs text-muted-foreground">
                Tipo de partido y estructura: {policy.lockedHint.toLowerCase()}
              </p>
            ) : null}
            <MatchFormatFields
              values={values}
              onChange={patch}
              readOnly={readOnly}
              matchPlayTypeLocked={matchPlayTypeLocked}
              equalsLocked={values.matchPlayType === "STANDARD"}
              presetOptions={[
                { value: "QUALITY", label: "Quality — 1 set" },
                { value: "STANDARD", label: "Torneo puntuable", disabled: true, hint: "Próximamente" },
                { value: "CUSTOM", label: "Personalizado" },
              ]}
              formatOptions={(
                [
                  ["GROUPS_ELIMINATION", "Zonas + eliminación"],
                  ["DIRECT_ELIMINATION", "Eliminación directa"],
                  ["ROUND_ROBIN", "Todos contra todos"],
                ] as const
              ).map(([value, label]) => ({
                value,
                label,
                disabled:
                  policy.lockFormat ||
                  (values.matchPlayType === "STANDARD" && !isScoringFormat(value)),
              }))}
              renderPresetExtra={(preset) =>
                preset === "STANDARD" ? (
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
                        disabled={readOnly}
                        onClick={() => setRulesOpen(true)}
                      >
                        Ver reglas
                      </Button>
                    </div>
                  </Alert>
                ) : null
              }
              afterPreset={
                <Field label="Máximo de parejas" htmlFor="maxPairs">
                  <Input
                    id="maxPairs"
                    type="number"
                    disabled={readOnly || values.matchPlayType === "STANDARD"}
                    min={values.matchPlayType === "STANDARD" ? SCORING_MIN_PAIRS : policy.minPairs}
                    max={values.matchPlayType === "STANDARD" ? SCORING_MAX_PAIRS : undefined}
                    value={values.maxPairs}
                    onChange={(e) => patch("maxPairs", Number(e.target.value))}
                  />
                  {values.matchPlayType === "STANDARD" ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo {SCORING_MIN_PAIRS} parejas. El mínimo y este máximo se
                      controlan al inscribir.
                    </p>
                  ) : policy.maxPairsHint ? (
                    <p className="text-xs text-muted-foreground mt-1">{policy.maxPairsHint}</p>
                  ) : null}
                </Field>
              }
            />
            {values.matchPlayType !== "QUALITY" ? (
              <PhaseDayPicker
                values={values}
                disabled={readOnly}
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
                ? " · zonas de 3, o de 4 si sobran parejas · pasan 2 · 1° vs 2° de otra zona"
                : ""}
            </p>
            <p className="text-muted-foreground">
              {values.endDate === values.startDate
                ? formatLongDateEs(values.startDate)
                : `${formatLongDateEs(values.startDate)} → ${formatLongDateEs(values.endDate)}`}
              {values.dailyStartTime ? ` · desde ${values.dailyStartTime}` : ""}
            </p>
          </div>
        </Section>
      </fieldset>

      {readOnly ? null : (
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            data-testid="tournament-form-submit"
            disabled={isSubmitting || datesInvalid || nameInvalid}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      )}
      <ScoringTournamentInfoDialog open={rulesOpen} onOpenChange={setRulesOpen} />
    </form>
  );
}

function PhaseDayPicker({
  values,
  onChange,
  disabled = false,
}: {
  values: TournamentFormValues;
  onChange: (phase: string, dayNumber: number) => void;
  disabled?: boolean;
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
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    onChange(phase.code, day.dayNumber);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60",
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
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
