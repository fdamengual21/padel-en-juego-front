import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/tournaments/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatCategoryLevel,
  isCategoryLevel,
  playerSidePreferenceLabel,
  type ParticipantsBoardView,
} from "@/domain";
import { formatTournamentDayEs } from "@/lib/dates";
import { sidePreferenceLabel } from "@/lib/tournamentLabels";

type ParticipantRow = ParticipantsBoardView["rows"][number];

interface RegistrationDetailModalProps {
  open: boolean;
  row: ParticipantRow | null;
  categoryName: string | null;
  showAvailability: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RegistrationDetailModal({
  open,
  row,
  categoryName,
  showAvailability,
  onOpenChange,
}: RegistrationDetailModalProps) {
  const players = row ? columnsOf(row) : [];
  const availability = row?.availability ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
        data-testid="registration-detail-modal"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Inscripción
            {row?.registration ? <StatusBadge status={row.registration.status} /> : null}
          </DialogTitle>
          <DialogDescription>
            {categoryName ?? "Categoría del torneo"}
            {row?.pair.seed != null ? ` · Orden ${row.pair.seed}` : ""}
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {players.map((player) => (
                <section
                  key={player.key}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={player.name}
                      imageUrl={player.imageUrl}
                      size="sm"
                      alt={player.name}
                    />
                    <p className="min-w-0 truncate text-sm font-medium">{player.name}</p>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <Detail label="Categoría" value={player.category} />
                    <Detail label="Lado" value={player.side} />
                    {player.phone ? <Detail label="Teléfono" value={player.phone} /> : null}
                    {player.ranking != null ? (
                      <Detail label="Ranking" value={String(player.ranking)} />
                    ) : null}
                  </dl>
                </section>
              ))}
            </div>

            {row.registration?.statusNote ? (
              <p className="mt-3 text-sm text-destructive/90">
                Nota: {row.registration.statusNote}
              </p>
            ) : null}

            {row.registration?.status === "CANCELLED" && row.registration.cancelledBy ? (
              <p className="mt-3 text-sm text-muted-foreground">{cancelledByLabel(row)}</p>
            ) : null}

            {showAvailability ? (
              <section className="mt-4 border-t border-border pt-4">
                <h3 className="text-sm font-medium">Disponibilidad</h3>
                {availability.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No declararon horarios.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {availability.map((slot) => (
                      <li
                        key={`${slot.date}-${slot.startTime}`}
                        className="rounded-lg border border-border px-3 py-2"
                      >
                        <p className="text-sm font-medium">
                          {formatTournamentDayEs(slot.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slot.startTime} – {slot.endTime}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function cancelledByLabel(row: ParticipantRow): string {
  if (row.registration?.cancelledBy === "club") return "La canceló el club.";
  const name = row.players?.find((player) => player?.id === row.registration?.cancelledById)
    ?.displayName;
  return name ? `La canceló ${name}.` : "La canceló un jugador de la pareja.";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

interface Column {
  key: string;
  name: string;
  imageUrl: string | null;
  category: string;
  side: string;
  phone: string | null;
  ranking: number | null;
}

function columnsOf(row: ParticipantRow): Column[] {
  const first = row.players?.[0];
  const second = row.players?.[1];
  const columns: Column[] = [
    {
      key: first?.id ?? `${row.pair.id}-1`,
      name: first?.displayName || row.playerNames[0] || "Jugador",
      imageUrl: row.playerAvatars?.[0] ?? null,
      category: categoryLabel(first?.categoryLevel),
      side: playerSidePreferenceLabel(first?.sidePreference) ?? "Sin preferencia",
      phone: first?.phone ?? null,
      ranking: row.registration?.rankingPointsPlayer1 ?? null,
    },
  ];

  if (row.incomplete || !row.pair.player2Id) {
    columns.push({
      key: `${row.pair.id}-seeking`,
      name: "Buscando pareja",
      imageUrl: null,
      category: "—",
      side: sidePreferenceLabel(row.pair.sidePreference),
      phone: null,
      ranking: null,
    });
    return columns;
  }

  columns.push({
    key: second?.id ?? `${row.pair.id}-2`,
    name: second?.displayName || row.playerNames[1] || "Jugador",
    imageUrl: row.playerAvatars?.[1] ?? null,
    category: categoryLabel(second?.categoryLevel),
    side: playerSidePreferenceLabel(second?.sidePreference) ?? "Sin preferencia",
    phone: second?.phone ?? null,
    ranking: row.registration?.rankingPointsPlayer2 ?? null,
  });
  return columns;
}

function categoryLabel(level: number | null | undefined): string {
  return isCategoryLevel(level) ? formatCategoryLevel(level) : "Sin categoría";
}
