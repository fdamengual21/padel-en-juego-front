import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import Avatar from "@/components/Avatar";
import PhoneWhatsApp from "@/components/PhoneWhatsApp";
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
import { sidePreferenceLabel } from "@/lib/tournamentLabels";
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
    queryKey: ["participant-players", categoryId, playerIds.join(",")],
    queryFn: () => Api.TournamentOpsService().getPublicParticipantPlayers(categoryId, playerIds),
    enabled: open && Boolean(categoryId) && playerIds.length > 0,
  });
  const loadedPlayers = playersQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
        data-testid="registration-detail-modal"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
          <DialogTitle>Inscripción</DialogTitle>
          <DialogDescription>
            {categoryName ?? "Categoría del torneo"}
            {row?.registeredAt ? ` · ${formatRegisteredAtEs(row.registeredAt)}` : ""}
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
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted-foreground">Categoría</dt>
                        <dd className="text-right">{player.category}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted-foreground">Lado</dt>
                        <dd className="text-right">{player.side}</dd>
                      </div>
                      {player.phone ? (
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">Teléfono</dt>
                          <dd className="min-w-0 text-right">
                            <PhoneWhatsApp phone={player.phone} />
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
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

function columnsOf(row: PublicParticipantRow, players: RegistrationPlayerDetail[]): Column[] {
  const first = players.find((player) => player.id === row.player1Id) ?? players[0];
  const columns: Column[] = [
    {
      key: first?.id ?? `${row.pairId}-1`,
      name: first?.displayName || row.playerNames[0] || "Jugador",
      imageUrl: row.playerAvatars[0],
      category:
        first && isCategoryLevel(first.categoryLevel)
          ? formatCategoryLevel(first.categoryLevel)
          : "Sin categoría",
      side: playerSidePreferenceLabel(first?.sidePreference) ?? "Sin preferencia",
      phone: first?.phone ?? null,
    },
  ];
  if (row.incomplete || !row.player2Id) {
    columns.push({
      key: `${row.pairId}-seeking`,
      name: "Buscando pareja",
      imageUrl: null,
      category: "—",
      side: sidePreferenceLabel(row.sidePreference),
      phone: null,
    });
    return columns;
  }
  const second = players.find((player) => player.id === row.player2Id);
  columns.push({
    key: second?.id ?? `${row.pairId}-2`,
    name: second?.displayName || row.playerNames[1] || "Jugador",
    imageUrl: row.playerAvatars[1],
    category:
      second && isCategoryLevel(second.categoryLevel)
        ? formatCategoryLevel(second.categoryLevel)
        : "Sin categoría",
    side: playerSidePreferenceLabel(second?.sidePreference) ?? "Sin preferencia",
    phone: second?.phone ?? null,
  });
  return columns;
}
