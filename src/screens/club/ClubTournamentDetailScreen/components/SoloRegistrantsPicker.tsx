import StatusBadge from "@/components/tournaments/StatusBadge";
import type { PairSidePreference, RegistrationStatus } from "@/domain";
import { seekingPartnerLabel } from "@/lib/tournamentLabels";
import { cn } from "@/lib/utils";

export interface SoloRegistrationCandidate {
  pairId: string;
  playerId: string;
  displayName: string;
  status: RegistrationStatus;
  sidePreference: PairSidePreference | null;
}

interface SoloRegistrantsPickerProps {
  candidates: SoloRegistrationCandidate[];
  selectedPlayerId: string | null;
  onSelect: (playerId: string | null) => void;
}

export default function SoloRegistrantsPicker({
  candidates,
  selectedPlayerId,
  onSelect,
}: SoloRegistrantsPickerProps) {
  if (candidates.length === 0) return null;

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">Inscriptos solos</p>
        <p className="text-xs text-muted-foreground">
          Elegí uno para unirlo a esta inscripción. Otro click lo desmarca.
        </p>
      </div>
      <ul
        className="space-y-2"
        role="radiogroup"
        aria-label="Inscriptos solos"
      >
        {candidates.map((candidate) => {
          const active = candidate.playerId === selectedPlayerId;
          const inputId = `solo-registrant-${candidate.pairId}`;
          return (
            <li key={candidate.pairId}>
              <label
                htmlFor={inputId}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm leading-tight",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-muted/60",
                )}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="solo-registrant"
                  value={candidate.playerId}
                  checked={active}
                  data-testid={`solo-registrant-${candidate.pairId}`}
                  className="mt-1 size-4 shrink-0 accent-primary"
                  onClick={(event) => {
                    if (active) {
                      event.preventDefault();
                      onSelect(null);
                    }
                  }}
                  onChange={() => onSelect(candidate.playerId)}
                />
                <span className="min-w-0 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">
                      {candidate.displayName}
                    </span>
                    <StatusBadge status={candidate.status} />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {seekingPartnerLabel(candidate.sidePreference)}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
