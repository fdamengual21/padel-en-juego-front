import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import RegistrationPlayerCard, {
  type RegistrationPlayerColumn,
} from "@/components/tournaments/RegistrationPlayerCard";
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
  type RegistrationPlayerDetail,
} from "@/domain";
import { formatRegisteredAtEs } from "@/lib/dates";
import { seekingPartnerLabel } from "@/lib/tournamentLabels";
import type { PublicParticipantRow } from "@/modules/tournament-ops/types";

interface PublicParticipantDetailModalProps {
  open: boolean;
  row: PublicParticipantRow | null;
  categoryId: string;
  categoryName: string | null;
  onOpenChange: (open: boolean) => void;
}

export default function PublicParticipantDetailModal({
  open,
  row,
  categoryId,
  categoryName,
  onOpenChange,
}: PublicParticipantDetailModalProps) {
  const playerIds = row
    ? [row.player1Id, row.player2Id].filter((id): id is string => Boolean(id))
    : [];
  const playersQuery = useQuery({
    queryKey: ["public-participant-players", categoryId, playerIds.join(",")],
    queryFn: () => Api.TournamentOpsService().getPublicParticipantPlayers(categoryId, playerIds),
    enabled: open && Boolean(categoryId) && playerIds.length > 0,
  });
  const loadedPlayers = playersQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-w-2xl flex-col gap-0 overflow-hidden p-0"
        data-testid="registration-detail-modal"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Inscripción
            {row?.status ? <StatusBadge status={row.status} /> : null}
          </DialogTitle>
          <DialogDescription>
            {categoryName ?? "Categoría del torneo"}
            {row?.registeredAt ? ` · ${formatRegisteredAtEs(row.registeredAt)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
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
              <div className="grid gap-3 sm:grid-cols-2">
                {columnsOf(row, loadedPlayers).map((player) => (
                  <RegistrationPlayerCard key={player.key} player={player} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function columnsOf(
  row: PublicParticipantRow,
  players: RegistrationPlayerDetail[],
): RegistrationPlayerColumn[] {
  const disclosePhone = row.status !== "PENDING";
  const first = players.find((player) => player.id === row.player1Id) ?? players[0];
  const columns: RegistrationPlayerColumn[] = [
    {
      key: first?.id ?? `${row.pairId}-1`,
      name: first?.displayName || row.playerNames[0] || "Jugador",
      imageUrl: row.playerAvatars[0],
      userId: first?.userId ?? null,
      category:
        first && isCategoryLevel(first.categoryLevel)
          ? formatCategoryLevel(first.categoryLevel)
          : "Sin categoría",
      side: playerSidePreferenceLabel(first?.sidePreference) ?? "Sin preferencia",
      phone: disclosePhone ? (first?.phone ?? null) : null,
    },
  ];
  if (row.incomplete || !row.player2Id) {
    columns.push({
      key: `${row.pairId}-seeking`,
      name: seekingPartnerLabel(row.sidePreference),
      imageUrl: null,
      userId: null,
      category: "—",
      side: "—",
      phone: null,
    });
    return columns;
  }
  const second = players.find((player) => player.id === row.player2Id);
  columns.push({
    key: second?.id ?? `${row.pairId}-2`,
    name: second?.displayName || row.playerNames[1] || "Jugador",
    imageUrl: row.playerAvatars[1],
    userId: second?.userId ?? null,
    category:
      second && isCategoryLevel(second.categoryLevel)
        ? formatCategoryLevel(second.categoryLevel)
        : "Sin categoría",
    side: playerSidePreferenceLabel(second?.sidePreference) ?? "Sin preferencia",
    phone: disclosePhone ? (second?.phone ?? null) : null,
  });
  return columns;
}
