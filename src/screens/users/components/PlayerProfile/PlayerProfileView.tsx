import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserX } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import PlayerMatchResultDialog from "@/components/tournaments/PlayerMatchResultDialog";
import type { PlayerMatchView } from "@/domain";
import PublicParticipantDetailModal from "@/screens/users/components/PublicParticipantDetailModal";
import { usePublicPairDetail } from "@/screens/users/hooks/usePublicPairDetail";
import PlayerCompetitionList from "./PlayerCompetitionList";
import PlayerProfileAgenda from "./PlayerProfileAgenda";
import PlayerProfileHeader from "./PlayerProfileHeader";
import PublicPlayerSeasonStats from "./PublicPlayerSeasonStats";

interface PlayerProfileViewProps {
  userId: string;
  /** El jugador logueado mirando su propio perfil. */
  isOwner: boolean;
}

export default function PlayerProfileView({ userId, isOwner }: PlayerProfileViewProps) {
  const [resultMatch, setResultMatch] = useState<PlayerMatchView | null>(null);
  const pairDetail = usePublicPairDetail();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-player-profile", userId],
    queryFn: () => Api.TournamentOpsService().getPublicPlayerProfile(userId),
    enabled: Boolean(userId),
  });

  const openPair = (item: PlayerMatchView, pairId: string) =>
    pairDetail.openPair(item.match.tournamentCategoryId, pairId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Cargando perfil">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={UserX}
        tone="error"
        title={isOwner ? "No se pudo cargar tu perfil" : "No encontramos este jugador"}
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PlayerProfileHeader data={data} isOwner={isOwner} />
      {isOwner ? <PlayerProfileAgenda /> : null}
      <PublicPlayerSeasonStats season={data.season} partner={data.frequentPartner} />
      <PlayerCompetitionList
        userId={userId}
        season={data.season}
        onOpenResult={setResultMatch} onOpenPair={openPair} />

      <PlayerMatchResultDialog
        item={resultMatch}
        onOpenChange={(open) => {
          if (!open) setResultMatch(null);
        }}
      />
      <PublicParticipantDetailModal
        open={pairDetail.row !== null}
        row={pairDetail.row}
        categoryId={pairDetail.categoryId}
        categoryName={null}
        onOpenChange={(open) => {
          if (!open) pairDetail.close();
        }}
      />
    </div>
  );
}
