import type { SidePosition } from "@/domain";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface SidePreferenceValue {
  primary: SidePosition | null;
  secondary: SidePosition | null;
}

interface SidePreferenceFieldsProps {
  value: SidePreferenceValue;
  onChange: (value: SidePreferenceValue) => void;
  idPrefix?: string;
  /** Compact layout for nested forms (alta manual). */
  compact?: boolean;
}

const PRIMARY_OPTIONS: { value: SidePosition | null; label: string }[] = [
  { value: "drive", label: "Drive" },
  { value: "reves", label: "Revés" },
  { value: null, label: "Sin preferencia" },
];

function otherSide(side: SidePosition): SidePosition {
  return side === "drive" ? "reves" : "drive";
}

function otherSideLabel(side: SidePosition): string {
  return side === "drive" ? "Revés" : "Drive";
}

export default function SidePreferenceFields({
  value,
  onChange,
  idPrefix = "side-pref",
  compact = false,
}: SidePreferenceFieldsProps) {
  const secondaryEnabled =
    value.primary != null && value.secondary === otherSide(value.primary);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="space-y-1.5">
        <Label id={`${idPrefix}-primary-label`}>Preferencia de lado</Label>
        <p className="text-xs text-muted-foreground">
          Posición principal. Podés marcar también la otra si jugás ambos.
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby={`${idPrefix}-primary-label`}
        >
          {PRIMARY_OPTIONS.map((opt) => {
            const selected = value.primary === opt.value;
            return (
              <Button
                key={opt.label}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() => {
                  if (opt.value == null) {
                    onChange({ primary: null, secondary: null });
                    return;
                  }
                  onChange({
                    primary: opt.value,
                    secondary:
                      value.secondary === otherSide(opt.value)
                        ? value.secondary
                        : null,
                  });
                }}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {value.primary ? (
        <div className="space-y-1.5">
          <Label id={`${idPrefix}-secondary-label`}>También juego (opcional)</Label>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby={`${idPrefix}-secondary-label`}
          >
            <Button
              type="button"
              size="sm"
              variant={secondaryEnabled ? "default" : "outline"}
              onClick={() =>
                onChange({
                  primary: value.primary,
                  secondary: secondaryEnabled
                    ? null
                    : otherSide(value.primary!),
                })
              }
            >
              {otherSideLabel(value.primary)}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function emptySidePreference(): SidePreferenceValue {
  return { primary: null, secondary: null };
}

export function playerSidePreferenceLabel(
  primary: SidePosition | null | undefined,
  secondary: SidePosition | null | undefined,
): string {
  if (!primary) return "Sin preferencia";
  const primaryLabel = primary === "drive" ? "Drive" : "Revés";
  if (secondary && secondary !== primary) {
    const secondaryLabel = secondary === "drive" ? "Drive" : "Revés";
    return `${primaryLabel} (también ${secondaryLabel})`;
  }
  return primaryLabel;
}
