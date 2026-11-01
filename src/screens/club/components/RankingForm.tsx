import { useMemo, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import TournamentBannerField from "@/screens/club/components/TournamentBannerField";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORY_LEVELS,
  formatCategoryLevel,
  type CategoryGender,
  type CategoryKind,
  type CategoryLevel,
} from "@/domain";
import { toIsoDateOnly } from "@/lib/dates";
import { toastError } from "@/lib/toast";
import type { ClubRankingCircuit, RankingBannerDraft } from "@/modules/rankings";

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

export interface RankingFormValues {
  name: string;
  description: string;
  weekday: number;
  weekCount: number;
  firstDate: string;
  dailyStartTime: string;
  registrationFee: number;
  categoryKind: CategoryKind;
  categoryLevel: CategoryLevel | null;
  categoryGender: CategoryGender;
  sumaTarget: number | null;
  categoryName: string;
  maxPairs: number;
  prizes: Array<{ place: number; label: string }>;
}

export function defaultRankingFormValues(
  partial?: Partial<RankingFormValues>,
): RankingFormValues {
  const weekday = partial?.weekday ?? 4;
  const today = toIsoDateOnly(new Date());
  const firstDate = partial?.firstDate ?? nextWeekday(today, weekday);
  const categoryKind = partial?.categoryKind ?? "level";
  const categoryLevel = partial?.categoryLevel ?? 6;
  const categoryGender = partial?.categoryGender ?? "male";
  const sumaTarget = partial?.sumaTarget ?? 12;
  const values: RankingFormValues = {
    name: "",
    description: "",
    weekday,
    weekCount: 8,
    firstDate,
    dailyStartTime: "19:00",
    registrationFee: 0,
    categoryKind,
    categoryLevel,
    categoryGender,
    sumaTarget,
    categoryName: "",
    maxPairs: 12,
    prizes: [
      { place: 1, label: "" },
      { place: 2, label: "" },
      { place: 3, label: "" },
    ],
    ...partial,
  };
  if (!values.categoryName) values.categoryName = rankingCategoryName(values);
  return values;
}

export function rankingCategoryName(values: RankingFormValues): string {
  const genderLabel =
    values.categoryGender === "male"
      ? "Masculino"
      : values.categoryGender === "female"
        ? "Femenino"
        : "Mixto";
  if (values.categoryKind === "suma") return `Suma ${values.sumaTarget ?? 12} ${genderLabel}`;
  return `${formatCategoryLevel(values.categoryLevel ?? 6)} ${genderLabel}`;
}

export function circuitToRankingFormValues(circuit: ClubRankingCircuit): RankingFormValues {
  return defaultRankingFormValues({
    name: circuit.name,
    description: circuit.description ?? "",
    weekday: circuit.weekday,
    weekCount: circuit.weekCount,
    firstDate: circuit.firstDate,
    dailyStartTime: circuit.dailyStartTime ?? "19:00",
    registrationFee: circuit.registrationFee,
    categoryKind: circuit.kind as CategoryKind,
    categoryLevel: (circuit.level as CategoryLevel | null) ?? null,
    categoryGender: circuit.gender as CategoryGender,
    sumaTarget: circuit.sumaTarget,
    categoryName: circuit.categoryName,
    maxPairs: circuit.defaultMaxPairs,
    prizes: circuit.prizes.map((item) => ({ place: item.place, label: item.label })),
  });
}

function nextWeekday(iso: string, weekday: number): string {
  const date = new Date(`${iso}T12:00:00`);
  const delta = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  return toIsoDateOnly(date);
}

interface RankingFormProps {
  submitLabel: string;
  isSubmitting?: boolean;
  bannerUrl?: string | null;
  /** `edit`: calendario, categoría y cupo quedan fijos; el cupo se cambia en cada fecha. */
  mode?: "create" | "edit";
  initialValues?: RankingFormValues;
  onSubmit: (values: RankingFormValues, banner: RankingBannerDraft) => Promise<void> | void;
}

export default function RankingForm({
  submitLabel,
  isSubmitting = false,
  bannerUrl = null,
  mode = "create",
  initialValues,
  onSubmit,
}: RankingFormProps) {
  const locked = mode === "edit";
  const [values, setValues] = useState<RankingFormValues>(
    () => initialValues ?? defaultRankingFormValues(),
  );
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const today = useMemo(() => toIsoDateOnly(new Date()), []);

  const patch = <K extends keyof RankingFormValues>(key: K, value: RankingFormValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "weekday") {
        next.firstDate = nextWeekday(
          next.firstDate < today ? today : next.firstDate,
          value as number,
        );
      }
      if (
        key === "categoryKind" ||
        key === "categoryLevel" ||
        key === "categoryGender" ||
        key === "sumaTarget"
      ) {
        next.categoryName = rankingCategoryName(next);
      }
      return next;
    });
  };

  return (
    <form
      className="space-y-6"
      data-testid="ranking-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!values.name.trim()) {
          toastError("Ingresá el nombre del ranking");
          return;
        }
        if (!locked && values.firstDate < today) {
          toastError("La primera fecha no puede ser anterior a hoy");
          return;
        }
        if (!locked && (values.weekCount < 4 || values.weekCount > 52)) {
          toastError("El ranking dura entre 4 y 52 semanas");
          return;
        }
        void onSubmit(values, { file: bannerFile, remove: removeBanner });
      }}
    >
      <fieldset className="m-0 grid min-w-0 gap-4 border-0 p-0 md:grid-cols-2 md:gap-5">
        <Section title="Ranking" description="Nombre, flyer y premios del circuito. Las fechas se generan solas.">
          <Field label="Nombre" htmlFor="ranking-name">
            <Input
              id="ranking-name"
              value={values.name}
              placeholder="Jueves 6ª"
              onChange={(event) => patch("name", event.target.value)}
            />
          </Field>
          <Field label="Descripción" htmlFor="ranking-desc">
            <Input
              id="ranking-desc"
              value={values.description}
              onChange={(event) => patch("description", event.target.value)}
            />
          </Field>
          <TournamentBannerField
            bannerUrl={bannerUrl}
            file={bannerFile}
            remove={removeBanner}
            onFileSelect={(file) => {
              setBannerFile(file);
              setRemoveBanner(false);
            }}
            onRemove={() => {
              setBannerFile(null);
              setRemoveBanner(true);
            }}
          />
          <Field label="Precio de inscripción" htmlFor="ranking-fee">
            <Input
              id="ranking-fee"
              type="number"
              min={0}
              step={100}
              value={values.registrationFee}
              onChange={(event) =>
                patch("registrationFee", Math.max(0, Number(event.target.value) || 0))
              }
            />
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">Premios del ranking</p>
            <p className="text-xs text-muted-foreground">
              Van a quienes terminen en ese puesto de la tabla. Si hay empate, se reparte.
            </p>
            {values.prizes.map((prize, index) => (
              <div key={index} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={prize.place}
                  onChange={(event) => {
                    const place = Math.max(1, Number(event.target.value) || 1);
                    patch(
                      "prizes",
                      values.prizes.map((item, i) => (i === index ? { ...item, place } : item)),
                    );
                  }}
                />
                <Input
                  placeholder="Texto del premio"
                  value={prize.label}
                  onChange={(event) =>
                    patch(
                      "prizes",
                      values.prizes.map((item, i) =>
                        i === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Quitar premio"
                  onClick={() =>
                    patch(
                      "prizes",
                      values.prizes.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                patch("prizes", [
                  ...values.prizes,
                  { place: values.prizes.length + 1, label: "" },
                ])
              }
            >
              Agregar premio
            </Button>
          </div>
        </Section>

        <Section
          title="Calendario"
          description={
            locked
              ? "Las fechas ya están generadas. Para mover una, cambiale el día desde su configuración."
              : "Un Quality por semana. Quality y el formato quedan fijos."
          }
        >
          <Field label="Día" htmlFor="ranking-weekday">
            <select
              id="ranking-weekday"
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-60"
              disabled={locked}
              value={values.weekday}
              onChange={(event) => patch("weekday", Number(event.target.value))}
            >
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cantidad de fechas" htmlFor="ranking-weeks">
            <Input
              id="ranking-weeks"
              type="number"
              min={4}
              max={52}
              disabled={locked}
              value={values.weekCount}
              onChange={(event) =>
                patch("weekCount", Math.min(52, Math.max(4, Number(event.target.value) || 4)))
              }
            />
          </Field>
          <Field label="Primera fecha" htmlFor="ranking-first">
            <DatePicker
              id="ranking-first"
              value={values.firstDate}
              minDate={locked ? undefined : today}
              disabled={locked}
              onChange={(next) => {
                if (next && next >= today) patch("firstDate", next);
              }}
            />
          </Field>
          <Field label="Horario" htmlFor="ranking-time">
            <Input
              id="ranking-time"
              type="time"
              value={values.dailyStartTime}
              onChange={(event) => patch("dailyStartTime", event.target.value)}
            />
          </Field>
          <Field label="Cupo por fecha" htmlFor="ranking-cupo">
            <Input
              id="ranking-cupo"
              type="number"
              min={6}
              disabled={locked}
              value={values.maxPairs}
              onChange={(event) =>
                patch("maxPairs", Math.max(6, Number(event.target.value) || 12))
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {locked
                ? "El cupo se cambia en cada fecha, desde su configuración."
                : "Mínimo 6 parejas para comenzar cada fecha."}
            </p>
          </Field>
        </Section>

        <Section
          title="Categoría"
          description={
            locked
              ? "Fija desde que se creó el ranking."
              : "Queda congelada al crear el ranking. Quality, zonas y eliminación."
          }
        >
          <fieldset disabled={locked} className="m-0 min-w-0 space-y-4 border-0 p-0 disabled:opacity-60">
            <div className="space-y-2">
              <p className="text-sm font-medium">Tipo</p>
              {(
                [
                  ["level", "Por nivel (1ª a 8ª)"],
                  ["suma", "Suma"],
                ] as const
              ).map(([kind, label]) => (
                <label key={kind} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="rankingKind"
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
                    name="rankingGender"
                    checked={values.categoryGender === gender}
                    onChange={() => patch("categoryGender", gender as CategoryGender)}
                  />
                  {label}
                </label>
              ))}
            </div>
            {values.categoryKind === "level" ? (
              <Field label="Nivel" htmlFor="ranking-level">
                <select
                  id="ranking-level"
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  value={values.categoryLevel ?? 6}
                  onChange={(event) =>
                    patch("categoryLevel", Number(event.target.value) as CategoryLevel)
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
              <Field label="Suma" htmlFor="ranking-suma">
                <Input
                  id="ranking-suma"
                  type="number"
                  min={2}
                  value={values.sumaTarget ?? 12}
                  onChange={(event) => patch("sumaTarget", Number(event.target.value) || 12)}
                />
              </Field>
            )}
            <Field label="Nombre visible" htmlFor="ranking-cat">
              <Input
                id="ranking-cat"
                value={values.categoryName}
                onChange={(event) => patch("categoryName", event.target.value)}
              />
            </Field>
          </fieldset>
        </Section>
      </fieldset>

      <Button type="submit" disabled={isSubmitting || !values.name.trim()}>
        {submitLabel}
      </Button>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="h-full space-y-4 rounded-xl border border-border bg-card p-4">
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
