import type { ReactNode } from "react";
import type { EqualsResolution, RulesetPreset, TournamentFormat } from "@/domain";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface MatchFormatValues {
  matchPlayType: RulesetPreset;
  equalsResolution: EqualsResolution;
  setsToWin: number;
  tiebreakPoints: number;
  format: TournamentFormat;
}

export interface MatchFormatOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  hint?: string;
}

interface MatchFormatFieldsProps {
  idPrefix?: string;
  values: MatchFormatValues;
  onChange: (
    key: keyof MatchFormatValues,
    value: MatchFormatValues[keyof MatchFormatValues],
  ) => void;
  presetOptions: ReadonlyArray<MatchFormatOption<RulesetPreset>>;
  formatOptions: ReadonlyArray<MatchFormatOption<TournamentFormat>>;
  /** Tipo de partido, iguales, sets y tie-break fijos. */
  matchPlayTypeLocked?: boolean;
  /** Iguales fijos aunque el tipo de partido se pueda cambiar (p. ej. torneo puntuable). */
  equalsLocked?: boolean;
  readOnly?: boolean;
  /** Contenido debajo de la opción de tipo de partido elegida. */
  renderPresetExtra?: (preset: RulesetPreset) => ReactNode;
  /** Contenido entre el tipo de partido y los iguales (p. ej. máximo de parejas). */
  afterPreset?: ReactNode;
}

export default function MatchFormatFields({
  idPrefix = "match",
  values,
  onChange,
  presetOptions,
  formatOptions,
  matchPlayTypeLocked = false,
  equalsLocked = false,
  readOnly = false,
  renderPresetExtra,
  afterPreset,
}: MatchFormatFieldsProps) {
  const rulesLocked = readOnly || matchPlayTypeLocked;
  const equalsDisabled = rulesLocked || equalsLocked;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Tipo de partido</p>
        {presetOptions.map((option) => {
          const optionDisabled = rulesLocked || option.disabled;
          return (
            <div key={option.value} className="space-y-2">
              <label
                className={cn(
                  "flex items-center gap-2 text-sm",
                  optionDisabled && "cursor-not-allowed text-muted-foreground",
                )}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-matchPlayType`}
                  checked={values.matchPlayType === option.value}
                  disabled={optionDisabled}
                  onChange={() => onChange("matchPlayType", option.value)}
                />
                {option.label}
                {option.hint ? (
                  <span className="text-xs text-muted-foreground">{option.hint}</span>
                ) : null}
              </label>
              {values.matchPlayType === option.value ? renderPresetExtra?.(option.value) : null}
            </div>
          );
        })}
      </div>

      {afterPreset}

      <div className="space-y-2">
        <p className="text-sm font-medium">En iguales (40-40)</p>
        {(
          [
            ["goldenPoint", "Punto de oro"],
            ["advantage", "Con ventaja (diferencia de 2)"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className={cn(
              "flex items-center gap-2 text-sm",
              equalsDisabled && "cursor-not-allowed text-muted-foreground",
            )}
          >
            <input
              type="radio"
              name={`${idPrefix}-equalsResolution`}
              checked={values.equalsResolution === value}
              disabled={equalsDisabled}
              onChange={() => onChange("equalsResolution", value)}
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
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-setsToWin`}>Sets para ganar el partido</Label>
            <Input
              id={`${idPrefix}-setsToWin`}
              type="number"
              min={1}
              max={3}
              value={values.setsToWin}
              disabled={rulesLocked}
              onChange={(e) => onChange("setsToWin", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-tbPoints`}>Tie-break a (puntos)</Label>
            <Input
              id={`${idPrefix}-tbPoints`}
              type="number"
              min={5}
              max={15}
              value={values.tiebreakPoints}
              disabled={rulesLocked}
              onChange={(e) => onChange("tiebreakPoints", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Con diferencia de 2 (ej. 7 puntos).
            </p>
          </div>
        </div>
      ) : values.matchPlayType === "QUALITY" ? (
        <p className="text-xs text-muted-foreground">
          Quality: 1 set a 6 juegos; a 6-6 se juega tie-break a 7.
        </p>
      ) : null}

      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-sm font-medium">Estructura del torneo</p>
        <div className="space-y-2">
          {formatOptions.map((option) => {
            const locked = readOnly || option.disabled;
            return (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  locked && "cursor-not-allowed text-muted-foreground",
                )}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-format`}
                  checked={values.format === option.value}
                  disabled={locked}
                  onChange={() => onChange("format", option.value)}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        {values.format === "GROUPS_ELIMINATION" ? (
          <p className="text-sm text-muted-foreground">
            Zonas de 3. Si sobra una pareja, la zona A queda de 4. Si sobran
            dos, A y B quedan de 4. De cada zona pasan 2. En la llave, 1° vs
            2° de otra zona.
          </p>
        ) : null}
      </div>
    </div>
  );
}
