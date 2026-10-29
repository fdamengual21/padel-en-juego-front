import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import { toastError } from "@/lib/toast";
import type { PublicParticipantRow } from "@/modules/tournament-ops/types";

/** Carga la inscripción pública de una pareja, igual que al tocarla en el cuadro. */
export function usePublicPairDetail() {
  const [request, setRequest] = useState<{ categoryId: string; pairId: string } | null>(
    null,
  );
  const [row, setRow] = useState<PublicParticipantRow | null>(null);
  const query = useQuery({
    queryKey: ["public-participants-board", request?.categoryId],
    queryFn: () => Api.TournamentOpsService().getPublicParticipantsBoard(request!.categoryId),
    enabled: Boolean(request?.categoryId),
  });

  useEffect(() => {
    if (!request) {
      setRow(null);
      return;
    }
    if (query.isFetching) return;
    if (query.isError) {
      toastError(
        "No se pudo abrir la inscripción",
        query.error instanceof Error ? query.error.message : undefined,
      );
      setRequest(null);
      return;
    }
    const found =
      query.data?.rows.find((item) => item.pairId === request.pairId) ?? null;
    if (!found) {
      toastError("No se encontró la inscripción de esa pareja.");
      setRequest(null);
      return;
    }
    setRow(found);
  }, [request, query.isFetching, query.isError, query.error, query.data]);

  return {
    row,
    categoryId: request?.categoryId ?? "",
    openPair: (categoryId: string, pairId: string) => setRequest({ categoryId, pairId }),
    close: () => {
      setRequest(null);
      setRow(null);
    },
  };
}
