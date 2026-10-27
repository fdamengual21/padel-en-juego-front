import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/tournaments/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Api from "@/api/Api";
import {
  formatCategoryLevel,
  isCategoryLevel,
  playerSidePreferenceLabel,
  type ParticipantRegistrationView,
  type ParticipantsBoardView,
  type RegistrationPlayerDetail,
} from "@/domain";
import { formatRegisteredAtEs, formatTournamentDayEs } from "@/lib/dates";
import { sidePreferenceLabel } from "@/lib/tournamentLabels";

type ParticipantRow = ParticipantsBoardView["rows"][number];

interface RegistrationDetailModalProps {
  open: boolean;
  row: ParticipantRow | null;
  registration: ParticipantRegistrationView | null;
  categoryId: string;
  categoryName: string | null;
  showAvailability: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RegistrationDetailModal({
  open,
  row,
  registration,
  categoryId,
  categoryName,
  showAvailability,
  onOpenChange,
}: RegistrationDetailModalProps) {
  const playerIds = row
    ? [row.pair.player1Id, row.pair.player2Id].filter((id): id is string => Boolean(id))
    : [];
  const playersQuery = useQuery({
    queryKey: ["participant-players", categoryId, playerIds.join(",")],
    queryFn: () =>
      Api.TournamentOpsService().getParticipantPlayers(categoryId, playerIds),
    enabled: open && Boolean(categoryId) && playerIds.length > 0,
  });

  const availability = row?.availability ?? [];
  const loadedPlayers = playersQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
        data-testid="registration-detail-modal"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Inscripción
            {registration ? <StatusBadge status={registration.status} /> : null}
          </DialogTitle>
          <DialogDescription>
            {categoryName ?? "Categoría del torneo"}
            {registration?.registeredAt
              ? ` · ${formatRegisteredAtEs(registration.registeredAt)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {playersQuery.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Cargando inscripción…
              </p>
            ) : playersQuery.isError ? (
              <p className="text-sm text-destructive">
                {playersQuery.error instanceof Error
                  ? playersQuery.error.message
                  : "No se pudo cargar la inscripción."}
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {columnsOf(row, loadedPlayers).map((player) => (
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
                      </dl>
                    </section>
                  ))}
                </div>

                {registration?.statusNote ? (
                  <p className="mt-3 text-sm text-destructive/90">
                    Nota: {registration.statusNote}
                  </p>
                ) : null}

                {registration?.status === "CANCELLED" && registration.cancelledBy ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {cancelledByLabel(registration, loadedPlayers)}
                  </p>
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
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function cancelledByLabel(
  registration: ParticipantRegistrationView,
  players: RegistrationPlayerDetail[],
): string {
  if (registration.cancelledBy === "club") return "La canceló el club.";
  const name = players.find((player) => player.id === registration.cancelledById)?.displayName;
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
}

function columnsOf(row: ParticipantRow, players: RegistrationPlayerDetail[]): Column[] {
  const first = players.find((player) => player.id === row.pair.player1Id) ?? players[0];
  const second = row.pair.player2Id
    ? players.find((player) => player.id === row.pair.player2Id)
    : undefined;
  const columns: Column[] = [
    {
      key: first?.id ?? `${row.pair.id}-1`,
      name: first?.displayName || row.playerNames[0] || "Jugador",
      imageUrl: row.playerAvatars?.[0] ?? null,
      category: categoryLabel(first?.categoryLevel),
      side: playerSidePreferenceLabel(first?.sidePreference) ?? "Sin preferencia",
      phone: first?.phone ?? null,
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
  });
  return columns;
}

function categoryLabel(level: number | null | undefined): string {
  return isCategoryLevel(level) ? formatCategoryLevel(level) : "Sin categoría";
}
