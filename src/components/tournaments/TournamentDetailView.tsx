import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { LoaderCircle, Trash2 } from "lucide-react";
import { PERMISSION_CLUB_TOURNAMENTS_WRITE } from "@/authorization";
import { PermissionsGuard } from "@/components/guards";
import {
  OCCUPYING_REGISTRATION_STATUSES,
  createId,
  canOpenMatchResult,
  isMatchResultComplete,
  isQualityPreset,
  knockoutRebuildBlockedReason,
  resolveMatchDurationMinutes,
  type Match,
  type MatchPhase,
  type MatchResultInput,
  type MatchRules,
  type ParticipantsBoardView,
} from "@/domain";
import Api from "@/api/Api";
import MatchCard from "@/components/tournaments/MatchCard";
import RegistrationDetailModal from "@/components/tournaments/RegistrationDetailModal";
import StatusBadge from "@/components/tournaments/StatusBadge";
import TournamentRulesDialog from "@/components/tournaments/TournamentRulesDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MessageAlert from "@/components/ui/message-alert";
import WarningDialog from "@/components/ui/warning-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Avatar from "@/components/Avatar";
import { formatRegisteredAtEs } from "@/lib/dates";
import ClientDetailModal from "@/screens/club/ClubClientDetailScreen/components/ClientDetailModal";
import CuadroBoard from "@/screens/club/ClubTournamentDetailScreen/components/CuadroBoard";
import KnockoutPhasesModal from "@/screens/club/ClubTournamentDetailScreen/components/KnockoutPhasesModal";
import GroupZonesPanel from "@/screens/club/ClubTournamentDetailScreen/components/GroupZonesPanel";
import MatchResultModal from "@/screens/club/ClubTournamentDetailScreen/components/MatchResultModal";
import PairFormModal from "@/screens/club/ClubTournamentDetailScreen/components/PairFormModal";
import TournamentForm, {
  defaultTournamentFormValues,
} from "@/screens/club/components/TournamentForm";
import {
  buildMatchRulesFromForm,
  countTournamentDays,
  phaseDayListFromMap,
  phaseDayMapFromList,
  type TournamentFormValues,
} from "@/modules/tournaments/types";
import { ROUTES } from "@/router/routes";
import { formatTournamentDayEs } from "@/lib/dates";
import { resolveMatchPlayStatus } from "@/lib/matchPlayStatus";
import { sidePreferenceLabel } from "@/lib/tournamentLabels";
import { ApiHttpError } from "@/lib/apiClient";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

interface TournamentDetailViewProps {
  tournamentId: string;
}

const FALLBACK_MATCH_RULES: MatchRules = {
  setFormat: "best_of_3",
  setsToWin: 2,
  gamesPerSet: 6,
  advantageType: "goldenPoint",
  goldenPoint: true,
  tiebreakEnabled: true,
  tiebreakPoints: 7,
  tiebreakWinByTwo: true,
  superTiebreakEnabled: true,
  superTiebreakPoints: 10,
  superTiebreakWinByTwo: true,
};

function AutoAssignButton({
  blockedReason,
  pending,
  onOpen,
}: {
  blockedReason: string | null;
  pending: boolean;
  onOpen: () => void;
}) {
  const disabled = pending || Boolean(blockedReason);
  const button = (
    <Button type="button" size="sm" disabled={disabled} onClick={onOpen}>
      {pending ? "Asignando…" : "Autoasignar horarios y canchas"}
    </Button>
  );
  if (!blockedReason) return button;
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          {button}
        </TooltipTrigger>
        <TooltipContent>{blockedReason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function TournamentDetailView({
  tournamentId,
}: TournamentDetailViewProps) {
  const qc = useQueryClient();
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [pendingDateValues, setPendingDateValues] =
    useState<TournamentFormValues | null>(null);
  const [dqRegistrationId, setDqRegistrationId] = useState<string | null>(null);
  const [dqNote, setDqNote] = useState("");
  const [removeRegistrationId, setRemoveRegistrationId] = useState<string | null>(
    null,
  );
  const [removeNote, setRemoveNote] = useState("");
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<
    ParticipantsBoardView["rows"][number]["pair"] | null
  >(null);
  const [confirmAddStartedOpen, setConfirmAddStartedOpen] = useState(false);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishPhase, setFinishPhase] = useState<"confirm" | "pending" | "done">("confirm");
  const [finishOk, setFinishOk] = useState(false);
  const [finishDetail, setFinishDetail] = useState("");
  const [activeTab, setActiveTab] = useState("grupos");
  const [knockoutPhasesOpen, setKnockoutPhasesOpen] = useState(false);
  const [clientDetailId, setClientDetailId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<
    ParticipantsBoardView["rows"][number] | null
  >(null);
  const [requestedPairId, setRequestedPairId] = useState<string | null>(null);

  const { data: tournament } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: () => Api.TournamentService().getById(tournamentId),
  });
  const { data: clubCourts = [] } = useQuery({
    queryKey: ["courts", "tournament-form"],
    queryFn: () => Api.CourtService().list(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", tournamentId],
    queryFn: () => Api.TournamentOpsService().listCategories(tournamentId),
    enabled: Boolean(tournamentId),
  });
  const categoryId = categories[0]?.id || "";
  const category = categories.find((item) => item.id === categoryId) ?? categories[0];

  const { data: pairs = [] } = useQuery({
    queryKey: ["pairs", categoryId],
    queryFn: () => Api.TournamentOpsService().listPairs(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: registrations = [] } = useQuery({
    queryKey: ["registrations", categoryId],
    queryFn: () => Api.TournamentOpsService().listRegistrations(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", categoryId],
    queryFn: () => Api.TournamentOpsService().listGroups(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: matches = [] } = useQuery({
    queryKey: ["matches", categoryId],
    queryFn: () => Api.TournamentOpsService().listMatches(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => Api.TournamentOpsService().listPlayers(),
    enabled: activeTab === "partidos" || Boolean(resultMatchId),
  });
  const { data: ruleset } = useQuery({
    queryKey: ["ruleset", categoryId],
    queryFn: () => Api.TournamentOpsService().getRuleset(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: courtReservations = [] } = useQuery({
    queryKey: ["court-reservations", tournament?.clubId],
    queryFn: () =>
      Api.TournamentOpsService().listCourtReservations(tournament!.clubId),
    enabled: Boolean(tournament?.clubId) && (activeTab === "grupos" || assignOpen),
  });

  const matchDurationMinutes = resolveMatchDurationMinutes(ruleset?.preset);
  const requirePairAvailability = !isQualityPreset(ruleset?.preset);

  const {
    data: zonesBoard,
  } = useQuery({
    queryKey: ["zones-board", categoryId],
    queryFn: () => Api.TournamentOpsService().getZonesBoard(categoryId),
    enabled: Boolean(categoryId) && (activeTab === "grupos" || assignOpen),
  });
  const {
    data: participantsBoard,
    isFetching: participantsFetching,
    isError: participantsError,
    error: participantsQueryError,
  } = useQuery({
    queryKey: ["participants-board", categoryId],
    queryFn: () => Api.TournamentOpsService().getParticipantsBoard(categoryId),
    enabled:
      Boolean(categoryId) &&
      (activeTab === "participantes" || requestedPairId != null),
  });

  const toastedAutoMatchKeys = useRef(new Set<string>());

  useEffect(() => {
    if (activeTab !== "participantes") return;
    const matches = participantsBoard?.autoMatches ?? [];
    if (!participantsBoard || matches.length === 0) return;
    const key = `${participantsBoard.generatedAt}:${matches
      .map((m) => m.survivingPairId)
      .join(",")}`;
    if (toastedAutoMatchKeys.current.has(key)) return;
    toastedAutoMatchKeys.current.add(key);
    for (const match of matches) {
      toastSuccess(
        "Pareja armada automáticamente",
        `${match.player1Name} y ${match.player2Name} se unieron por preferencia de lado`,
      );
    }
    void qc.invalidateQueries({ queryKey: ["pairs", categoryId] });
    void qc.invalidateQueries({ queryKey: ["registrations", categoryId] });
  }, [participantsBoard, categoryId, qc, activeTab]);

  useEffect(() => {
    if (!requestedPairId || participantsFetching) return;
    if (participantsError) {
      setRequestedPairId(null);
      toastError(
        "No se pudo abrir la inscripción",
        participantsQueryError instanceof Error ? participantsQueryError.message : undefined,
      );
      return;
    }
    if (!participantsBoard) return;
    const row =
      participantsBoard.rows.find((item) => item.pair.id === requestedPairId) ?? null;
    setRequestedPairId(null);
    if (row) setDetailRow(row);
    else toastError("No se encontró la inscripción de esa pareja.");
  }, [requestedPairId, participantsBoard, participantsFetching, participantsError, participantsQueryError]);

  const openPairDetail = (pairId: string) => {
    const row = participantsBoard?.rows.find((item) => item.pair.id === pairId);
    if (row) {
      setDetailRow(row);
      return;
    }
    setRequestedPairId(pairId);
  };
  const {
    data: cuadroBoard,
    isFetching: cuadroFetching,
  } = useQuery({
    queryKey: ["cuadro", categoryId],
    queryFn: () => Api.TournamentOpsService().getCuadroBoard(categoryId),
    enabled: Boolean(categoryId),
  });
  const {
    data: matchesBoard,
  } = useQuery({
    queryKey: ["matches-board", categoryId],
    queryFn: () => Api.TournamentOpsService().getMatchesBoard(categoryId),
    enabled: Boolean(categoryId) && activeTab === "partidos",
  });
  const {
    data: configBoard,
  } = useQuery({
    queryKey: ["config-board", categoryId],
    queryFn: () => Api.TournamentOpsService().getConfigBoard(categoryId),
    enabled: Boolean(categoryId) && activeTab === "config",
  });

  const invalidateOps = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["groups", categoryId] }),
      qc.invalidateQueries({ queryKey: ["matches", categoryId] }),
      qc.invalidateQueries({ queryKey: ["zones-board", categoryId] }),
      qc.invalidateQueries({ queryKey: ["participants-board", categoryId] }),
      qc.invalidateQueries({ queryKey: ["cuadro", categoryId] }),
      qc.invalidateQueries({ queryKey: ["matches-board", categoryId] }),
      qc.invalidateQueries({ queryKey: ["config-board", categoryId] }),
      qc.invalidateQueries({ queryKey: ["ruleset", categoryId] }),
      qc.invalidateQueries({ queryKey: ["pairs", categoryId] }),
      qc.invalidateQueries({ queryKey: ["registrations", categoryId] }),
      qc.invalidateQueries({ queryKey: ["players"] }),
      qc.invalidateQueries({ queryKey: ["tournament", tournamentId] }),
      qc.invalidateQueries({ queryKey: ["categories", tournamentId] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const savePairMutation = useMutation({
    mutationFn: async (input: {
      mode: "create" | "edit";
      pairId?: string;
      player1Id: string;
      player2Id: string | null;
      sidePreference: import("@/domain").PairSidePreference | null;
      rankingPointsPlayer1?: number | null;
      rankingPointsPlayer2?: number | null;
      availability?: Array<{
        date: string;
        startTime: string;
        endTime: string;
      }>;
    }) => {
      if (input.mode === "edit" && input.pairId) {
        return {
          kind: "edit" as const,
          pair: await Api.TournamentOpsService().updatePairPlayers(input.pairId, {
            player1Id: input.player1Id,
            player2Id: input.player2Id,
            sidePreference: input.sidePreference,
            rankingPointsPlayer1: input.rankingPointsPlayer1,
            rankingPointsPlayer2: input.rankingPointsPlayer2,
          }),
          autoMatch: null as import("@/domain").SoloPairAutoMatchResult | null,
        };
      }
      const result = await Api.TournamentOpsService().registerPairByAdmin({
        tournamentCategoryId: categoryId,
        player1Id: input.player1Id,
        player2Id: input.player2Id,
        sidePreference: input.sidePreference,
        rankingPointsPlayer1: input.rankingPointsPlayer1,
        rankingPointsPlayer2: input.rankingPointsPlayer2,
        availability: input.availability,
      });
      return {
        kind: "create" as const,
        pair: result.pair,
        autoMatch: result.autoMatch,
      };
    },
    onSuccess: async (data, vars) => {
      if (data.autoMatch) {
        toastSuccess(
          "Pareja armada automáticamente",
          `${data.autoMatch.player1Name} y ${data.autoMatch.player2Name} se unieron por preferencia de lado`,
        );
      } else if (vars.mode === "edit") {
        toastSuccess("Pareja actualizada");
      } else if (vars.player2Id) {
        toastSuccess("Inscripción aceptada");
      } else {
        toastSuccess(
          "Inscripción creada",
          "Queda pendiente hasta que le asignes pareja.",
        );
      }
      await invalidateOps();
      const shouldSyncStructure = Boolean(vars.player2Id) || Boolean(data.autoMatch);
      if (shouldSyncStructure) {
        const result =
          await Api.TournamentOpsService().syncCategoryStructure(categoryId);
        if (result.message) toastInfo("Estructura actualizada", result.message);
        await invalidateOps();
      }
    },
    onError: (err: Error) => {
      toastError("No se pudo guardar la pareja", err.message);
    },
  });

  useEffect(() => {
    if (!categoryId || !tournament) return;
    if (tournament.status === "finished" || tournament.status === "cancelled") return;
    void Api.TournamentOpsService()
      .syncCategoryStructure(categoryId)
      .then(async () => {
        await invalidateOps();
      });
    // Sync once when category is ready / registrations already seeded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, registrations.length, tournament?.status]);

  const localPairLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const pair of pairs) {
      const p1 = players.find((p) => p.id === pair.player1Id)?.displayName ?? "?";
      if (!pair.player2Id) {
        map[pair.id] = `${p1} / Buscando pareja (${sidePreferenceLabel(pair.sidePreference)})`;
      } else {
        const p2 = players.find((p) => p.id === pair.player2Id)?.displayName ?? "?";
        map[pair.id] = `${p1} / ${p2}`;
      }
    }
    return map;
  }, [pairs, players]);

  const localPairPlayerNames = useMemo(() => {
    const map: Record<string, [string, string]> = {};
    for (const pair of pairs) {
      const p1 = players.find((p) => p.id === pair.player1Id)?.displayName ?? "?";
      const p2 = pair.player2Id
        ? (players.find((p) => p.id === pair.player2Id)?.displayName ?? "?")
        : `Buscando (${sidePreferenceLabel(pair.sidePreference)})`;
      map[pair.id] = [p1, p2];
    }
    return map;
  }, [pairs, players]);

  const pairLabels =
    zonesBoard?.pairLabels ??
    matchesBoard?.pairLabels ??
    cuadroBoard?.pairLabels ??
    localPairLabels;

  const pairPlayerNames =
    zonesBoard?.pairPlayerNames ??
    cuadroBoard?.pairPlayerNames ??
    participantsBoard?.rows.reduce<Record<string, [string, string]>>((acc, row) => {
      acc[row.pair.id] = row.playerNames;
      return acc;
    }, {}) ??
    localPairPlayerNames;

  const enrolledPlayerIds = useMemo(() => {
    const ids: string[] = [];
    for (const row of participantsBoard?.rows ?? []) {
      const status = row.registration?.status;
      if (status && !OCCUPYING_REGISTRATION_STATUSES.has(status) && !row.disqualified) {
        continue;
      }
      ids.push(row.pair.player1Id);
      if (row.pair.player2Id) ids.push(row.pair.player2Id);
    }
    return ids;
  }, [participantsBoard?.rows]);

  const refreshAfterResult = async () => {
    const jobs = [
      qc.invalidateQueries({ queryKey: ["tournament", tournamentId] }),
      qc.invalidateQueries({ queryKey: ["matches", categoryId] }),
    ];
    if (activeTab === "grupos") {
      jobs.push(qc.invalidateQueries({ queryKey: ["zones-board", categoryId] }));
    }
    if (activeTab === "participantes") {
      jobs.push(qc.invalidateQueries({ queryKey: ["participants-board", categoryId] }));
    }
    if (activeTab === "cuadro") {
      jobs.push(qc.invalidateQueries({ queryKey: ["cuadro", categoryId] }));
    }
    if (activeTab === "partidos") {
      jobs.push(qc.invalidateQueries({ queryKey: ["matches-board", categoryId] }));
    }
    if (activeTab === "config") {
      jobs.push(qc.invalidateQueries({ queryKey: ["config-board", categoryId] }));
    }
    await Promise.all(jobs);
  };

  const submitResult = useMutation({
    mutationFn: (input: { matchId: string; result: MatchResultInput }) =>
      Api.TournamentOpsService().submitMatchResult(input.matchId, input.result),
    onSuccess: async () => {
      toastSuccess("Resultado cargado");
      await refreshAfterResult();
    },
    onError: (err: Error) => {
      toastError("No se pudo cargar el resultado", err.message);
    },
  });

  const setLive = useMutation({
    mutationFn: (input: { matchId: string; status: "inProgress" | "scheduled" }) =>
      Api.TournamentOpsService().setMatchStatus(input.matchId, input.status),
    onSuccess: async (_data, variables) => {
      toastSuccess(
        variables.status === "inProgress"
          ? "Partido en juego"
          : "Partido vuelto a programado",
      );
      await invalidateOps();
    },
    onError: (err: Error) => {
      toastError("No se pudo actualizar el estado", err.message);
    },
  });

  const saveSchedule = useMutation({
    mutationFn: (input: {
      matchId: string;
      scheduledAt: string | null;
      courtId: string | null;
      force?: boolean;
    }) =>
      Api.TournamentOpsService().updateMatchSchedule(
        input.matchId,
        {
          scheduledAt: input.scheduledAt,
          courtId: input.courtId,
        },
        { force: input.force, pairLabels },
      ),
    onSuccess: async () => {
      toastSuccess("Agenda actualizada");
      await invalidateOps();
    },
    onError: (err: Error) => {
      toastError("No se pudo guardar la agenda", err.message);
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => Api.TournamentOpsService().finishTournament(tournamentId),
    onSuccess: async (result) => {
      setFinishOk(true);
      setFinishDetail(result.message);
      setFinishPhase("done");
      toastSuccess("Torneo finalizado", result.message);
      await invalidateOps();
    },
    onError: (err: Error) => {
      const logic = err instanceof ApiHttpError && err.status === 422;
      setFinishOk(false);
      setFinishDetail(
        logic ? err.message : "No se pudo finalizar el torneo. Probá de nuevo.",
      );
      setFinishPhase("done");
      toastError(
        logic ? "No se puede finalizar" : "No se pudo finalizar el torneo",
        logic ? err.message : undefined,
      );
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () => Api.TournamentOpsService().scheduleCategory(categoryId),
    onSuccess: async (result) => {
      toastSuccess(
        "Horarios asignados",
        result.message ??
          (result.pendingCount > 0
            ? `No hay canchas libres dentro de los días del torneo para ${result.pendingCount} partidos.`
            : `Se asignaron ${result.scheduledCount} partidos de ${result.phaseLabel ?? "la fase"}.`),
      );
      setAssignOpen(false);
      await invalidateOps();
    },
    onError: (err: Error) => {
      toastError("No se pudo programar", err.message);
    },
  });

  const configRuleset = configBoard?.ruleset ?? ruleset;

  const startMutation = useMutation({
    mutationFn: () => Api.TournamentOpsService().startTournament(tournamentId),
    onSuccess: async (result) => {
      setConfirmStartOpen(false);
      toastSuccess("Torneo comenzado", result.message);
      await Promise.all([
        invalidateOps(),
        qc.invalidateQueries({ queryKey: ["tournaments"] }),
      ]);
    },
    onError: (err: Error) => {
      const logic = err instanceof ApiHttpError && err.status === 422;
      toastError(
        logic ? "No se puede comenzar" : "No se pudo comenzar el torneo",
        logic ? err.message : undefined,
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => Api.TournamentOpsService().cancelTournament(tournamentId),
    onSuccess: async (result) => {
      setConfirmCancelOpen(false);
      toastSuccess("Torneo cancelado", result.message);
      await Promise.all([
        invalidateOps(),
        qc.invalidateQueries({ queryKey: ["tournaments"] }),
        qc.invalidateQueries({ queryKey: ["player-history"] }),
        qc.invalidateQueries({ queryKey: ["player-played"] }),
      ]);
    },
    onError: (err: Error) => {
      const logic = err instanceof ApiHttpError && err.status === 422;
      toastError(
        logic ? "No se puede cancelar" : "No se pudo cancelar el torneo",
        logic ? err.message : undefined,
      );
    },
  });

  const resolveTieMutation = useMutation({
    mutationFn: (input: { groupId: string; order: string[]; note: string }) =>
      Api.TournamentOpsService().resolveTie(categoryId, input.groupId, {
        order: input.order,
        note: input.note,
      }),
    onSuccess: async (result) => {
      toastSuccess("Empate resuelto", result.message);
      await invalidateOps();
    },
    onError: (err: Error) => {
      const logic = err instanceof ApiHttpError && err.status === 422;
      toastError(
        logic ? "No se puede desempatar así" : "No se pudo resolver el empate",
        logic ? err.message : undefined,
      );
    },
  });

  const addKnockoutPhaseMutation = useMutation({
    mutationFn: (phase: MatchPhase) =>
      Api.TournamentOpsService().addKnockoutPhase(categoryId, phase),
    onSuccess: async (result) => {
      toastSuccess("Ronda agregada", result.message);
      await invalidateOps();
    },
    onError: (err: Error) => {
      const logic = err instanceof ApiHttpError && err.status === 422;
      toastError(
        logic ? "No se puede agregar esa ronda" : "No se pudo agregar la ronda",
        logic ? err.message : undefined,
      );
    },
  });

  const removeKnockoutPhaseMutation = useMutation({
    mutationFn: (phase: MatchPhase) =>
      Api.TournamentOpsService().removeKnockoutPhase(categoryId, phase),
    onSuccess: async (result) => {
      toastSuccess("Ronda quitada", result.message);
      await invalidateOps();
    },
    onError: (err: Error) => {
      const logic = err instanceof ApiHttpError && err.status === 422;
      toastError(
        logic ? "No se puede quitar esa ronda" : "No se pudo quitar la ronda",
        logic ? err.message : undefined,
      );
    },
  });

  const movePairMutation = useMutation({
    mutationFn: (input: { pairId: string; phase: MatchPhase }) =>
      Api.TournamentOpsService().movePairToKnockoutPhase(categoryId, input),
    onSuccess: async (result) => {
      toastSuccess("Pareja movida", result.message);
      await invalidateOps();
    },
    onError: (err: Error) => {
      const logic = err instanceof ApiHttpError && err.status === 422;
      toastError(
        logic ? "No se puede mover esa pareja" : "No se pudo mover la pareja",
        logic ? err.message : undefined,
      );
    },
  });

  const pairingMutation = useMutation({
    mutationFn: (input: {
      matchId: string;
      pairAId: string;
      pairBId: string;
      note: string | null;
    }) =>
      Api.TournamentOpsService().setMatchPairing(input.matchId, {
        pairAId: input.pairAId,
        pairBId: input.pairBId,
        note: input.note,
      }),
    onSuccess: async (result) => {
      toastSuccess("Cruce actualizado", result.message);
      await invalidateOps();
    },
    onError: (err: Error) => {
      const logic = err instanceof ApiHttpError && err.status === 422;
      toastError(
        logic ? "No se puede fijar ese cruce" : "No se pudo modificar el cruce",
        logic ? err.message : undefined,
      );
    },
  });

  const qualifyPairMutation = useMutation({
    mutationFn: (input: { matchId: string; pairId: string }) =>
      Api.TournamentOpsService().qualifyMatchPair(input.matchId, input.pairId),
    onSuccess: async (result) => {
      toastSuccess("Pareja clasificada", result.message);
      await invalidateOps();
    },
    onError: (err: Error) => {
      const logic = err instanceof ApiHttpError && err.status === 422;
      toastError(
        logic ? "No se puede clasificar esa pareja" : "No se pudo clasificar la pareja",
        logic ? err.message : undefined,
      );
    },
  });

  const saveConfig = useMutation({
    mutationFn: async (input: { values: TournamentFormValues }) => {
      const { values } = input;
      const cfgTournament = configBoard?.tournament ?? tournament;
      const cfgCategory = configBoard?.category ?? category;
      if (!cfgTournament || !cfgCategory) throw new Error("Sin torneo");
      await Api.TournamentService().update(cfgTournament.id, {
        name: values.name,
        description: values.description || null,
        startDate: values.startDate,
        endDate: values.endDate,
        dailyStartTime: values.dailyStartTime,
        dailyEndTime: values.dailyEndTime,
        format: values.format,
        registrationFee: values.registrationFee,
        status: cfgTournament.status,
        phaseDays: phaseDayListFromMap(values.phaseDays),
        updatedAt: new Date().toISOString(),
      });
      await Api.TournamentOpsService().updateCategory(cfgCategory.id, {
        name: values.categoryName,
        gender: values.categoryGender,
        kind: values.categoryKind,
        level: values.categoryKind === "level" ? values.categoryLevel : null,
        sumaTarget: values.categoryKind === "suma" ? values.sumaTarget : null,
        maxPairs: values.maxPairs,
        circuitType: values.circuitType,
        status: cfgCategory.status,
      });
      await Api.TournamentOpsService().upsertRuleset({
        id: configRuleset?.id ?? createId("rules"),
        tournamentCategoryId: cfgCategory.id,
        preset: values.matchPlayType,
        matchRules: buildMatchRulesFromForm(values),
        tieBreakers: configRuleset?.tieBreakers ?? [
          "SET_DIFFERENCE",
          "POINTS",
          "HEAD_TO_HEAD",
          "GAME_DIFFERENCE",
        ],
        groupCount: null,
      });
      return Api.TournamentOpsService().syncCategoryStructure(cfgCategory.id);
    },
    onSuccess: async (result) => {
      toastSuccess("Configuración guardada", result.message);
      setPendingDateValues(null);
      await invalidateOps();
    },
    onError: (err: Error) => {
      toastError("No se pudo guardar la configuración", err.message);
    },
  });

  const disqualifyMutation = useMutation({
    mutationFn: (input: { registrationId: string; note: string }) =>
      Api.TournamentOpsService().disqualifyRegistration(
        input.registrationId,
        input.note,
      ),
    onSuccess: async () => {
      toastSuccess("Pareja desclasificada");
      setDqRegistrationId(null);
      setDqNote("");
      await invalidateOps();
    },
    onError: (err: Error) => {
      toastError("No se pudo desclasificar", err.message);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (registrationId: string) =>
      Api.TournamentOpsService().acceptRegistration(registrationId),
    onSuccess: async (result) => {
      if (result.autoMatch) {
        toastSuccess(
          "Inscripción aceptada y pareja armada",
          `${result.autoMatch.player1Name} y ${result.autoMatch.player2Name} se unieron por preferencia de lado`,
        );
      } else {
        toastSuccess("Inscripción aceptada");
      }
      await invalidateOps();
      if (categoryId) {
        const sync =
          await Api.TournamentOpsService().syncCategoryStructure(categoryId);
        if (sync.message) toastInfo("Estructura actualizada", sync.message);
        await invalidateOps();
      }
    },
    onError: (err: Error) => {
      toastError("No se pudo aceptar la inscripción", err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (input: { registrationId: string; note?: string }) =>
      Api.TournamentOpsService().rejectRegistration(
        input.registrationId,
        input.note,
      ),
    onSuccess: async () => {
      toastSuccess("Inscripción rechazada");
      await invalidateOps();
    },
    onError: (err: Error) => {
      toastError("No se pudo rechazar la inscripción", err.message);
    },
  });

  const removePairMutation = useMutation({
    mutationFn: (input: { registrationId: string; note: string }) =>
      Api.TournamentOpsService().removeRegistration(
        input.registrationId,
        input.note,
      ),
    onSuccess: async () => {
      toastSuccess("Pareja eliminada");
      setRemoveRegistrationId(null);
      setRemoveNote("");
      await invalidateOps();
      if (categoryId) {
        await Api.TournamentOpsService().syncCategoryStructure(categoryId);
        await invalidateOps();
      }
    },
    onError: (err: Error) => {
      toastError("No se pudo eliminar la pareja", err.message);
    },
  });

  if (!tournament) {
    return <p className="text-muted-foreground">Cargando torneo…</p>;
  }

  // Cupo con la misma cuenta que la API: parejas completas + solos de a dos.
  // El tablero de participantes lo trae calculado; fuera de esa pestaña se arma local.
  const localCapacity = (() => {
    const pairById = new Map(pairs.map((pair) => [pair.id, pair]));
    let completePairs = 0;
    let soloPlayers = 0;
    for (const reg of registrations) {
      if (reg.status !== "ACCEPTED") continue;
      const pair = pairById.get(reg.pairId);
      if (pair && pair.player2Id == null) soloPlayers += 1;
      else completePairs += 1;
    }
    const heldSpots = completePairs + Math.ceil(soloPlayers / 2);
    const maxPairs = category?.maxPairs ?? 0;
    const inDraw = new Set(
      (zonesBoard?.groups ?? groups).flatMap((group) => group.pairIds),
    ).size;
    return {
      maxPairs,
      completePairs,
      soloPlayers,
      heldSpots,
      inDraw,
      full: maxPairs > 0 && heldSpots >= maxPairs,
    };
  })();
  const capacity = participantsBoard?.capacity ?? localCapacity;
  const categoryFull = category != null && capacity.full;
  const admission = participantsBoard?.admission ?? { allowed: true, reason: null };
  const tournamentLocked =
    tournament.status === "finished" || tournament.status === "cancelled";
  const participantsLockedReason = tournamentLocked
    ? tournament.status === "cancelled"
      ? "El torneo está cancelado. Las inscripciones no se pueden modificar."
      : "El torneo ya finalizó. Las inscripciones no se pueden modificar."
    : null;
  const addPairBlockedReason = participantsLockedReason
    ? participantsLockedReason
    : !admission.allowed
      ? (admission.reason ?? "No se pueden sumar parejas en este momento.")
      : categoryFull
        ? "El cupo de parejas aceptadas está completo."
        : null;
  const canMutateParticipants = !tournamentLocked;
  const matchRules =
    zonesBoard?.matchRules ??
    matchesBoard?.matchRules ??
    cuadroBoard?.matchRules ??
    ruleset?.matchRules ??
    FALLBACK_MATCH_RULES;
  const liveCount = matches.filter(
    (m) => resolveMatchPlayStatus(m, matchRules) === "started",
  ).length;
  const finishedCount = matches.filter((m) => isMatchResultComplete(m, matchRules)).length;
  // Solo el botón «Comenzar torneo» inicia el torneo; horarios y canchas no cuentan.
  const tournamentStarted =
    participantsBoard?.tournamentStarted ??
    (tournament.status === "inProgress" || tournament.status === "finished");
  const knockoutStructure = cuadroBoard?.knockoutStructure;
  const knockoutPhasesBlockedReason =
    knockoutStructure?.rebuildBlockedReason ??
    (cuadroBoard
      ? knockoutRebuildBlockedReason(cuadroBoard.elimMatches, cuadroBoard.slots)
      : null);
  const showKnockoutPhasesButton =
    !tournamentLocked &&
    tournament.format === "GROUPS_ELIMINATION" &&
    (ruleset?.preset === "QUALITY" || ruleset?.preset === "CUSTOM") &&
    ((knockoutStructure?.addable.length ?? 0) > 0 ||
      (knockoutStructure?.removable.length ?? 0) > 0);
  const canStartTournament =
    tournament.status === "draft" || tournament.status === "registrationOpen";
  const canCancelTournament = !tournamentLocked;
  const resultMatch = resultMatchId
    ? (matches.find((m) => m.id === resultMatchId) ??
        zonesBoard?.allMatches.find((m) => m.id === resultMatchId) ??
        matchesBoard?.groupMatches.find((m) => m.id === resultMatchId) ??
        matchesBoard?.elimMatches.find((m) => m.id === resultMatchId) ??
        cuadroBoard?.elimMatches.find((m) => m.id === resultMatchId) ??
        null)
    : null;

  const openAddPair = () => {
    if (!canMutateParticipants) return;
    setEditingPair(null);
    if (tournamentStarted) {
      setConfirmAddStartedOpen(true);
      return;
    }
    setPairModalOpen(true);
  };

  const openResult = (match: Match) => {
    const canEdit = !tournamentLocked && match.status !== "cancelled";
    if (!canOpenMatchResult(match, canEdit)) return;
    setResultMatchId(match.id);
  };

  const formSource = configBoard
    ? {
        tournament: configBoard.tournament,
        category: configBoard.category,
        ruleset: configBoard.ruleset,
      }
    : {
        tournament,
        category,
        ruleset,
      };

  const formInitial = defaultTournamentFormValues({
    name: formSource.tournament.name,
    description: formSource.tournament.description ?? "",
    startDate: formSource.tournament.startDate,
    endDate: formSource.tournament.endDate ?? formSource.tournament.startDate,
    dailyStartTime: formSource.tournament.dailyStartTime ?? "10:00",
    dailyEndTime: formSource.tournament.dailyEndTime ?? "",
    registrationFee: formSource.tournament.registrationFee ?? 0,
    format: formSource.tournament.format,
    matchPlayType:
      formSource.ruleset?.preset === "QUALITY" ||
      formSource.ruleset?.preset === "CUSTOM" ||
      formSource.ruleset?.preset === "STANDARD"
        ? formSource.ruleset.preset
        : "STANDARD",
    equalsResolution: formSource.ruleset?.matchRules.goldenPoint
      ? "goldenPoint"
      : "advantage",
    setsToWin: formSource.ruleset?.matchRules.setsToWin ?? 2,
    tiebreakPoints: formSource.ruleset?.matchRules.tiebreakPoints ?? 7,
    categoryKind: formSource.category?.kind ?? "level",
    categoryLevel: formSource.category?.level ?? 6,
    categoryGender: formSource.category?.gender ?? "male",
    sumaTarget: formSource.category?.sumaTarget ?? 12,
    categoryName: formSource.category?.name ?? "",
    maxPairs: formSource.category?.maxPairs ?? 16,
    circuitType: formSource.category?.circuitType ?? "NONE",
    phaseDays: phaseDayMapFromList(
      formSource.tournament.phaseDays,
      formSource.tournament.format,
      countTournamentDays(
        formSource.tournament.startDate,
        formSource.tournament.endDate ?? formSource.tournament.startDate,
      ),
    ),
  });

  const summaryGroups = zonesBoard?.groups ?? groups;
  const summaryQualify = summaryGroups.reduce(
    (total, group) => total + (group.qualifies ?? 0),
    0,
  );
  const visibleParticipantRows = participantsBoard?.rows ?? [];
  const isOutOfDraw = (row: ParticipantsBoardView["rows"][number]) =>
    row.outOfDrawReason != null && row.registration?.cancelledBy !== "club";
  const participantGroups = [
    {
      key: "active",
      title: null as string | null,
      rows: visibleParticipantRows.filter(
        (row) => row.registration?.cancelledBy !== "club" && !isOutOfDraw(row),
      ),
    },
    {
      key: "out-of-draw",
      title: "Aceptadas fuera del cuadro",
      rows: visibleParticipantRows.filter(isOutOfDraw),
    },
    {
      key: "removed",
      title: "Eliminadas por el club",
      rows: visibleParticipantRows.filter((row) => row.registration?.cancelledBy === "club"),
    },
  ].filter((group) => group.rows.length > 0);
  // Resumen para la card: aceptadas que no entraron al cuadro, separando completas y solos.
  const outOfDrawSummary = (() => {
    if (!tournamentStarted) return null;
    const outRows = (participantsBoard?.rows ?? []).filter(isOutOfDraw);
    if (participantsBoard) {
      const solos = outRows.filter((row) => row.incomplete).length;
      const complete = outRows.length - solos;
      const parts = [
        complete > 0 ? `${complete} ${complete === 1 ? "aceptada" : "aceptadas"} fuera del cuadro` : null,
        solos > 0 ? `${solos} sin pareja` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(" · ") : null;
    }
    const outside = capacity.completePairs + capacity.soloPlayers - capacity.inDraw;
    return outside > 0 ? `${outside} ${outside === 1 ? "aceptada" : "aceptadas"} fuera del cuadro` : null;
  })();

  return (
    <div
      className="space-y-5"
      data-testid="club-tournament-detail"
    >
      <div>
        <Link
          to={ROUTES.club.tournaments}
          className="text-sm text-sidebar hover:underline"
        >
          ← Volver a torneos
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{tournament.name}</h2>
            {tournamentLocked ? null : (
              <StatusBadge status={tournament.status} />
            )}
            <TournamentRulesDialog
              format={tournament.format}
              matchRules={matchRules}
              categoryName={category?.name}
            />
            <span className="text-sm text-muted-foreground">{category?.name}</span>
          </div>
          {tournamentLocked ? (
            <StatusBadge
              status={tournament.status}
              className="h-8 px-3 text-sm"
            />
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canCancelTournament ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={cancelMutation.isPending}
                  onClick={() => setConfirmCancelOpen(true)}
                  data-testid="cancel-tournament-button"
                >
                  Cancelar torneo
                </Button>
              ) : null}
              {isQualityPreset(ruleset?.preset) ? null : (
              <AutoAssignButton
                blockedReason={
                  zonesBoard
                    ? zonesBoard.autoAssign.blockedReason
                    : activeTab === "grupos"
                      ? "Cargando la fase…"
                      : null
                }
                pending={
                  scheduleMutation.isPending ||
                  finishMutation.isPending ||
                  cancelMutation.isPending
                }
                onOpen={() => setAssignOpen(true)}
              />
              )}
              {canStartTournament ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={startMutation.isPending || cancelMutation.isPending}
                  onClick={() => setConfirmStartOpen(true)}
                  data-testid="start-tournament-button"
                >
                  Comenzar torneo
                </Button>
              ) : null}
              {canCancelTournament ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={finishMutation.isPending || cancelMutation.isPending}
                  onClick={() => {
                    setFinishPhase("confirm");
                    setFinishOk(false);
                    setFinishDetail("");
                    setFinishOpen(true);
                  }}
                >
                  Finalizar torneo
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <section
        className="rounded-xl border border-border bg-card p-4"
        data-testid="tournament-summary-card"
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <SummaryStat
            label="Fechas"
            value={
              tournament.endDate && tournament.endDate !== tournament.startDate
                ? `${formatTournamentDayEs(tournament.startDate)} → ${formatTournamentDayEs(tournament.endDate)}`
                : formatTournamentDayEs(tournament.startDate)
            }
          />
          {tournamentStarted ? (
            <SummaryStat
              label="En cuadro"
              value={`${capacity.inDraw} parejas`}
              detail={outOfDrawSummary}
            />
          ) : (
            <SummaryStat
              label="Aceptados"
              value={
                capacity.soloPlayers > 0
                  ? `${capacity.completePairs} parejas · ${capacity.soloPlayers} buscando pareja`
                  : `${capacity.completePairs} parejas`
              }
            />
          )}
          <SummaryStat
            label="Inscripción"
            value={
              tournament.registrationFee > 0
                ? `$ ${tournament.registrationFee.toLocaleString("es-AR")}`
                : "Sin cargo"
            }
          />
          <SummaryStat
            label="Circuito"
            value={
              category?.circuitType === "CICUPA" ? "CICUPA" : "Sin circuito"
            }
          />
          <SummaryStat
            label="Zonas"
            value={
              summaryGroups.length
                ? summaryQualify > 0
                  ? `${summaryGroups.length} · clasifican ${summaryQualify}`
                  : `${summaryGroups.length}`
                : "Pendiente de cupo"
            }
          />
          <SummaryStat
            label="Partidos"
            value={`${liveCount} en juego · ${finishedCount} finalizados`}
          />
        </dl>
      </section>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(String(value))}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="grupos">Zonas</TabsTrigger>
            <TabsTrigger value="participantes">Participantes</TabsTrigger>
            <TabsTrigger value="cuadro">Cuadro</TabsTrigger>
            <TabsTrigger value="partidos">Partidos</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>
          {showKnockoutPhasesButton ? (
            <PermissionsGuard permission={PERMISSION_CLUB_TOURNAMENTS_WRITE}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="knockout-phases-button"
                onClick={() => setKnockoutPhasesOpen(true)}
              >
                Fases del cuadro
              </Button>
            </PermissionsGuard>
          ) : null}
        </div>

        <TabsContent value="participantes" className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {tournamentLocked
                ? "Inscripciones de la categoría."
                : "Inscripciones de la categoría. Podés cargar parejas completas o un jugador solo."}
            </p>
            {addPairBlockedReason ? (
              <TooltipProvider delay={200}>
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" />}>
                    <Button type="button" size="sm" disabled data-testid="add-pair-button">
                      Agregar pareja
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{addPairBlockedReason}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={openAddPair}
                data-testid="add-pair-button"
              >
                Agregar pareja
              </Button>
            )}
          </div>
          {participantsLockedReason ? (
            <MessageAlert type="info" message={participantsLockedReason} />
          ) : !admission.allowed && admission.reason ? (
            <p
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              data-testid="admission-notice"
            >
              {admission.reason}
            </p>
          ) : null}
          {participantsBoard?.notice ? (
            <p className="text-sm text-muted-foreground">{participantsBoard.notice}</p>
          ) : null}
          {participantGroups.map((group) => (
            <section key={group.key} className="space-y-2">
              {group.title ? (
                <h3 className="text-sm font-medium">{group.title}</h3>
              ) : null}
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {group.rows.map((row) => {
              const { pair, registration: reg } = row;
              const playerRows: Array<{
                name: string;
                imageUrl: string | null;
                clientId: string | null;
              }> = [
                {
                  name: row.playerNames[0] ?? "?",
                  imageUrl: row.playerAvatars?.[0] ?? null,
                  clientId: row.playerClientIds?.[0] ?? null,
                },
              ];
              if (row.incomplete) {
                playerRows.push({
                  name: `Buscando pareja (${sidePreferenceLabel(pair.sidePreference)})`,
                  imageUrl: null,
                  clientId: null,
                });
              } else {
                playerRows.push({
                  name: row.playerNames[1] ?? "?",
                  imageUrl: row.playerAvatars?.[1] ?? null,
                  clientId: row.playerClientIds?.[1] ?? null,
                });
              }

              return (
                <li
                  key={pair.id}
                  data-testid="participant-card"
                  className="flex cursor-pointer flex-col gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => setDetailRow(row)}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      {playerRows.map((player, index) => {
                        const clickable = Boolean(player.clientId);
                        const inner = (
                          <>
                            <Avatar
                              name={player.name}
                              imageUrl={player.imageUrl}
                              size="sm"
                              alt={player.name}
                            />
                            <span className="truncate font-medium">
                              {player.name}
                            </span>
                          </>
                        );
                        return clickable ? (
                          <button
                            key={`${pair.id}-p${index}`}
                            type="button"
                            className="flex min-w-0 items-center gap-2 rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            onClick={(event) => {
                              event.stopPropagation();
                              setClientDetailId(player.clientId);
                            }}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div
                            key={`${pair.id}-p${index}`}
                            className="flex items-center gap-2 min-w-0"
                          >
                            {inner}
                          </div>
                        );
                      })}
                      {reg ? <StatusBadge status={reg.status} /> : null}
                      {row.disqualified ? (
                        <StatusBadge status="disqualified" />
                      ) : null}
                      {row.incomplete ? (
                        <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Incompleta
                        </span>
                      ) : null}
                      {isOutOfDraw(row) ? (
                        <TooltipProvider delay={200}>
                          <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />}>
                              <span
                                className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"
                                data-testid={`out-of-draw-${pair.id}`}
                              >
                                Fuera del cuadro
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {row.outOfDrawReason}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reg?.registeredAt
                        ? formatRegisteredAtEs(reg.registeredAt)
                        : "Sin fecha de inscripción"}
                      {pair.user1Id || pair.user2Id
                        ? " · equipo vinculado a usuario(s) del torneo"
                        : " · sin usuarios vinculados"}
                    </p>
                    {reg?.statusNote ? (
                      <p className="text-xs text-destructive/90">
                        Nota: {reg.statusNote}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className="flex flex-wrap gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {canMutateParticipants &&
                    (reg?.status === "PENDING" || reg?.status === "WAITLIST") ? (
                      <>
                        {row.incomplete || !pair.player2Id ? (
                          <TooltipProvider delay={200}>
                            <Tooltip>
                              <TooltipTrigger render={<span className="inline-flex" />}>
                                <Button type="button" size="sm" disabled>
                                  Aceptar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                Asigná un compañero antes de aceptar.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : admission.allowed ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={acceptMutation.isPending}
                            onClick={() => acceptMutation.mutate(reg.id)}
                          >
                            Aceptar
                          </Button>
                        ) : (
                          <TooltipProvider delay={200}>
                            <Tooltip>
                              <TooltipTrigger render={<span className="inline-flex" />}>
                                <Button type="button" size="sm" disabled>
                                  Aceptar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                {admission.reason ?? "No se pueden sumar parejas en este momento."}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={rejectMutation.isPending}
                          onClick={() =>
                            rejectMutation.mutate({ registrationId: reg.id })
                          }
                        >
                          Rechazar
                        </Button>
                      </>
                    ) : null}
                    {canMutateParticipants &&
                    !row.disqualified &&
                    reg?.status !== "CANCELLED" &&
                    reg?.status !== "REJECTED" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPair(pair);
                          setPairModalOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                    ) : null}
                    {canMutateParticipants &&
                    !row.disqualified &&
                    reg?.status === "ACCEPTED" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDqRegistrationId(reg.id);
                          setDqNote("");
                        }}
                      >
                        Desclasificar
                      </Button>
                    ) : null}
                    {canMutateParticipants &&
                    reg &&
                    reg.status !== "CANCELLED" &&
                    reg.status !== "REJECTED" &&
                    !row.disqualified ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setRemoveRegistrationId(reg.id);
                          setRemoveNote("");
                        }}
                      >
                        <Trash2 />
                        Eliminar
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
              </ul>
            </section>
          ))}
          {canMutateParticipants ? (
            <>
              <p className="text-xs text-muted-foreground">
                Las parejas completas que carga el club quedan aceptadas. Un
                jugador sin compañero queda pendiente hasta que el club le
                asigne pareja. Solo las completas aceptadas entran al armado de
                zonas y partidos.
              </p>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="grupos" className="space-y-4 pt-4">
          {zonesBoard?.notice ? (
            <p className="text-sm text-muted-foreground">{zonesBoard.notice}</p>
          ) : null}
          {zonesBoard ? (
            <GroupZonesPanel
              groups={zonesBoard.groups}
              matches={zonesBoard.groupMatches}
              standings={zonesBoard.standings}
              pairLabels={zonesBoard.pairLabels}
              pairPlayerNames={zonesBoard.pairPlayerNames}
              matchRules={zonesBoard.matchRules}
              courts={zonesBoard.courts}
              allMatches={zonesBoard.allMatches}
              slots={zonesBoard.slots}
              reservations={courtReservations}
              matchDurationMinutes={matchDurationMinutes}
              showCourtOccupancy={isQualityPreset(ruleset?.preset)}
              finishedGroupIds={zonesBoard.finishedGroupIds}
              tournamentLocked={tournamentLocked}
              scheduleSavingMatchId={
                saveSchedule.isPending
                  ? (saveSchedule.variables?.matchId ?? null)
                  : null
              }
              onSaveSchedule={async (input) => {
                await saveSchedule.mutateAsync(input);
              }}
              onOpenResult={openResult}
              onOpenPair={openPairDetail}
              statusSavingMatchId={
                setLive.isPending ? (setLive.variables?.matchId ?? null) : null
              }
              onSetStatus={async (input) => {
                await setLive.mutateAsync(input);
              }}
              unresolvedTies={zonesBoard.unresolvedTies}
              tieSavingGroupId={
                resolveTieMutation.isPending
                  ? (resolveTieMutation.variables?.groupId ?? null)
                  : null
              }
              onResolveTie={async (input) => {
                await resolveTieMutation.mutateAsync(input);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Cargando zonas…</p>
          )}
        </TabsContent>

        <TabsContent value="cuadro" className="space-y-4 pt-4">
          {cuadroBoard ? (
            <CuadroBoard
              board={cuadroBoard}
              isLoading={cuadroFetching}
              onOpenResult={openResult}
              onOpenPair={openPairDetail}
              tournamentStarted={tournamentStarted}
              tournamentLocked={tournamentLocked}
              pairingSavingMatchId={
                pairingMutation.isPending
                  ? (pairingMutation.variables?.matchId ?? null)
                  : null
              }
              onSetPairing={async (input) => {
                await pairingMutation.mutateAsync(input);
              }}
              moveSaving={movePairMutation.isPending}
              onMovePair={async (input) => {
                await movePairMutation.mutateAsync(input);
              }}
              qualifySaving={qualifyPairMutation.isPending}
              onQualifyPair={async (input) => {
                await qualifyPairMutation.mutateAsync(input);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {cuadroFetching ? "Cargando cuadro…" : "Sin datos de cuadro."}
            </p>
          )}
        </TabsContent>

        <TabsContent value="partidos" className="space-y-3 pt-4">
          {matchesBoard?.notice ? (
            <p className="text-sm text-muted-foreground">{matchesBoard.notice}</p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {(matchesBoard?.groupMatches ?? []).map((match) => {
              const canEditMatch =
                !tournamentLocked && match.status !== "cancelled";
              const canOpen = canOpenMatchResult(match, canEditMatch);
              const matchCard = (
                <MatchCard
                  match={match}
                  pairALabel={
                    (matchesBoard?.pairLabels ?? pairLabels)[match.pairAId ?? ""] ?? "A"
                  }
                  pairBLabel={
                    (matchesBoard?.pairLabels ?? pairLabels)[match.pairBId ?? ""] ?? "B"
                  }
                  phaseLabel="Zonas"
                  courtLabel={
                    match.courtId
                      ? (matchesBoard?.courtLabels[match.courtId] ?? null)
                      : null
                  }
                />
              );
              return (
              <div key={match.id} className="space-y-2">
                {canOpen ? (
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => openResult(match)}
                  >
                    {matchCard}
                  </button>
                ) : (
                  matchCard
                )}
                {match.status === "scheduled" &&
                match.pairAId &&
                match.pairBId &&
                !tournamentLocked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setLive.isPending}
                    onClick={() =>
                      setLive.mutate({ matchId: match.id, status: "inProgress" })
                    }
                  >
                    Marcar en juego
                  </Button>
                ) : null}
                {match.status === "inProgress" && !tournamentLocked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setLive.isPending}
                    onClick={() =>
                      setLive.mutate({ matchId: match.id, status: "scheduled" })
                    }
                  >
                    Volver a programado
                  </Button>
                ) : null}
              </div>
              );
            })}
          </div>
          {!matchesBoard ? (
            <p className="text-sm text-muted-foreground">Cargando partidos…</p>
          ) : matchesBoard.groupMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin partidos de zonas todavía.</p>
          ) : null}
        </TabsContent>

        <TabsContent value="config" className="pt-4 space-y-3">
          {tournamentLocked ? (
            <p className="text-sm text-muted-foreground">
              {tournament.status === "cancelled"
                ? "El torneo está cancelado. La configuración no se puede editar."
                : "El torneo ya finalizó. La configuración no se puede editar."}
            </p>
          ) : configBoard?.notice ? (
            <p className="text-sm text-muted-foreground">{configBoard.notice}</p>
          ) : null}
          {configBoard ? (
            <TournamentForm
              key={`${configBoard.generatedAt}-${configBoard.ruleset?.id ?? "rules"}`}
              courts={clubCourts
                .filter((court) => court.status === "active")
                .map((court) => ({ id: court.id, name: court.name }))}
              initialValues={formInitial}
              submitLabel="Guardar configuración"
              isSubmitting={saveConfig.isPending}
              readOnly={tournamentLocked}
              onSubmit={async (values) => {
                if (tournamentLocked) {
                  toastError(
                    "No se puede guardar la configuración",
                    "El torneo ya está cerrado.",
                  );
                  return;
                }
                const datesTouched =
                  formInitial.startDate !== values.startDate ||
                  formInitial.endDate !== values.endDate;
                const played = matches.some(
                  (match) =>
                    match.status === "finished" ||
                    match.status === "walkover" ||
                    match.status === "inProgress",
                );
                if (datesTouched && played) {
                  setPendingDateValues(values);
                  return;
                }
                await saveConfig.mutateAsync({ values });
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Cargando configuración…</p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(pendingDateValues)}
        onOpenChange={(open) => {
          if (!open) setPendingDateValues(null);
        }}
      >
        <DialogContent data-testid="date-change-dialog">
          <DialogHeader>
            <DialogTitle>Cambiar la fecha del torneo</DialogTitle>
            <DialogDescription>
              Las parejas inscriptas se mantienen y los resultados ya cargados también.
              El calendario pasa a las fechas nuevas. Los partidos que todavía no se
              jugaron quedan sin cancha ni horario, y hay que volver a programarlos.
              La disponibilidad marcada para los días anteriores se borra.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saveConfig.isPending}
              onClick={() => setPendingDateValues(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saveConfig.isPending || !pendingDateValues}
              onClick={() => {
                if (!pendingDateValues) return;
                void saveConfig.mutateAsync({ values: pendingDateValues });
              }}
            >
              Cambiar fecha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={canMutateParticipants && Boolean(dqRegistrationId)}
        onOpenChange={(open) => {
          if (!open) {
            setDqRegistrationId(null);
            setDqNote("");
          }
        }}
      >
        <DialogContent data-testid="disqualify-dialog">
          <DialogHeader>
            <DialogTitle>Desclasificar pareja</DialogTitle>
            <DialogDescription>
              La nota queda asociada a la inscripción. Los partidos pendientes se adjudican al rival
              (walkover).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dq-note">Motivo</Label>
            <textarea
              id="dq-note"
              rows={3}
              value={dqNote}
              onChange={(e) => setDqNote(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Ej. Ausencia / no corresponde a la categoría…"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={disqualifyMutation.isPending}
              onClick={() => {
                setDqRegistrationId(null);
                setDqNote("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={disqualifyMutation.isPending || !dqNote.trim() || !dqRegistrationId}
              onClick={() => {
                if (!dqRegistrationId) return;
                void disqualifyMutation.mutateAsync({
                  registrationId: dqRegistrationId,
                  note: dqNote,
                });
              }}
            >
              {disqualifyMutation.isPending ? "Guardando…" : "Desclasificar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={canMutateParticipants && Boolean(removeRegistrationId)}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveRegistrationId(null);
            setRemoveNote("");
          }
        }}
      >
        <DialogContent data-testid="remove-pair-dialog">
          <DialogHeader>
            <DialogTitle>Eliminar pareja</DialogTitle>
            <DialogDescription>
              Se da de baja la inscripción (con motivo). Los partidos pendientes de esta pareja se
              cancelan; no se adjudican walkovers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="remove-pair-note">Motivo</Label>
            <textarea
              id="remove-pair-note"
              rows={3}
              value={removeNote}
              onChange={(e) => setRemoveNote(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Ej. Se anotaron por error / se bajaron del torneo…"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={removePairMutation.isPending}
              onClick={() => {
                setRemoveRegistrationId(null);
                setRemoveNote("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                removePairMutation.isPending ||
                !removeNote.trim() ||
                !removeRegistrationId
              }
              onClick={() => {
                if (!removeRegistrationId) return;
                void removePairMutation.mutateAsync({
                  registrationId: removeRegistrationId,
                  note: removeNote,
                });
              }}
            >
              {removePairMutation.isPending ? "Eliminando…" : "Eliminar pareja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WarningDialog
        open={canMutateParticipants && confirmAddStartedOpen}
        onOpenChange={setConfirmAddStartedOpen}
        title="Torneo en curso"
        description="El torneo ya comenzó. La pareja nueva se suma a una zona que todavía no jugó y los partidos ya jugados quedan como están. ¿Querés agregarla?"
        cancelLabel="No"
        confirmLabel="Sí"
        onConfirm={() => {
          setConfirmAddStartedOpen(false);
          setEditingPair(null);
          setPairModalOpen(true);
        }}
      />

      <WarningDialog
        open={confirmCancelOpen}
        onOpenChange={(open) => {
          if (cancelMutation.isPending) return;
          setConfirmCancelOpen(open);
        }}
        title="Cancelar torneo"
        description="El torneo queda cancelado. No se asignan puntos ni cuenta en el historial de los jugadores. Esta acción no se deshace."
        cancelLabel="Volver"
        confirmLabel="Cancelar torneo"
        confirmVariant="destructive"
        isConfirming={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelMutation.isPending) return;
          cancelMutation.mutate();
        }}
      />

      <WarningDialog
        open={confirmStartOpen}
        onOpenChange={(open) => {
          if (startMutation.isPending) return;
          setConfirmStartOpen(open);
        }}
        title="Comenzar torneo"
        description={
          capacity.soloPlayers > 0
            ? `Se cierra la inscripción y se arma el cuadro con las ${capacity.completePairs} parejas aceptadas. Hay ${capacity.soloPlayers} jugadores sin pareja: se emparejan entre sí por orden de inscripción aunque jueguen del mismo lado; si queda uno impar, queda afuera. Esta acción no se deshace.`
            : `Se cierra la inscripción y se arma el cuadro con las ${capacity.completePairs} parejas aceptadas. Esta acción no se deshace.`
        }
        cancelLabel="Cancelar"
        confirmLabel="Comenzar"
        isConfirming={startMutation.isPending}
        onConfirm={() => {
          if (startMutation.isPending) return;
          startMutation.mutate();
        }}
      />

      <Dialog
        open={finishOpen}
        disablePointerDismissal={finishPhase === "pending"}
        onOpenChange={(open, details) => {
          if (!open && finishPhase === "pending") {
            details.cancel();
            return;
          }
          setFinishOpen(open);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {finishPhase === "pending"
                ? "Finalizando el torneo"
                : finishPhase === "done"
                  ? finishOk
                    ? "Torneo finalizado"
                    : finishDetail.startsWith("No se pudo finalizar")
                      ? "No se pudo finalizar"
                      : "No se puede finalizar"
                  : "Finalizar torneo"}
            </DialogTitle>
            {finishPhase === "confirm" ? (
              <DialogDescription>
                Al finalizar, el torneo queda cerrado. Resultados, cuadro, inscripciones
                y horarios dejan de poder editarse.
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {finishPhase === "pending" ? (
            <div className="flex items-center gap-3 py-2 text-sm">
              <LoaderCircle className="size-5 animate-spin" />
              Finalizando el torneo…
            </div>
          ) : null}
          {finishPhase === "done" ? (
            finishOk ? (
              <p>{finishDetail}</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {finishDetail
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => (
                    <li key={line}>{line}</li>
                  ))}
              </ul>
            )
          ) : null}
          {finishPhase !== "pending" ? (
            <DialogFooter>
              {finishPhase === "confirm" ? (
                <Button type="button" variant="outline" onClick={() => setFinishOpen(false)}>
                  Cancelar
                </Button>
              ) : null}
              <Button
                type="button"
                variant={finishPhase === "confirm" ? "destructive" : "default"}
                onClick={() => {
                  if (finishPhase === "confirm") {
                    setFinishPhase("pending");
                    finishMutation.mutate();
                    return;
                  }
                  setFinishOpen(false);
                }}
              >
                {finishPhase === "confirm" ? "Finalizar" : "Cerrar"}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autoasignar horarios y canchas</DialogTitle>
            <DialogDescription>
              Se van a asignar cancha y horario a{" "}
              {zonesBoard?.autoAssign.eligibleCount ?? 0} partidos de{" "}
              {zonesBoard?.autoAssign.phaseLabel || "esta fase"}. Esta asignación
              automática se hace una sola vez en esta fase.
              {(zonesBoard?.autoAssign.manualCount ?? 0) > 0
                ? ` ${zonesBoard?.autoAssign.manualCount} partidos ya tienen horario o cancha cargados a mano y no se van a modificar.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={scheduleMutation.isPending}
              onClick={() => setAssignOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                scheduleMutation.isPending ||
                !categoryId ||
                !zonesBoard ||
                Boolean(zonesBoard.autoAssign.blockedReason)
              }
              onClick={() => scheduleMutation.mutate()}
            >
              {scheduleMutation.isPending ? "Asignando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PairFormModal
        open={canMutateParticipants && pairModalOpen}
        mode={editingPair ? "edit" : "create"}
        clubId={tournament?.clubId ?? ""}
        pair={editingPair}
        registration={
          editingPair
            ? (registrations.find((r) => r.pairId === editingPair.id) ?? null)
            : null
        }
        circuitType={category?.circuitType ?? "NONE"}
        requireAvailability={requirePairAvailability}
        tournamentStartDate={tournament?.startDate}
        tournamentEndDate={tournament?.endDate}
        dailyStartTime={tournament?.dailyStartTime}
        dailyEndTime={tournament?.dailyEndTime}
        categoryId={categoryId}
        enrolledPlayerIds={enrolledPlayerIds}
        isSaving={savePairMutation.isPending}
        onOpenChange={(open) => {
          setPairModalOpen(open);
          if (!open) setEditingPair(null);
        }}
        onCreatePlayer={async (draft) => {
          const ageNum = Number(draft.age);
          const player = await Api.TournamentOpsService().createPlayer({
            firstName: draft.firstName,
            lastName: draft.lastName,
            phone: draft.phone.trim() || null,
            email: draft.email.trim() || null,
            age: Number.isFinite(ageNum) && draft.age.trim() ? ageNum : null,
            categoryLevel: draft.categoryLevel,
            sidePreferencePrimary: draft.sidePreferencePrimary,
            sidePreferenceSecondary: draft.sidePreferenceSecondary,
          });
          await qc.invalidateQueries({ queryKey: ["players"] });
          return player;
        }}
        onSubmit={async (values) => {
          await savePairMutation.mutateAsync({
            mode: editingPair ? "edit" : "create",
            pairId: editingPair?.id,
            ...values,
          });
        }}
      />

      <KnockoutPhasesModal
        open={knockoutPhasesOpen}
        addable={knockoutStructure?.addable ?? []}
        removable={knockoutStructure?.removable ?? []}
        elimMatches={cuadroBoard?.elimMatches ?? []}
        blockedReason={knockoutPhasesBlockedReason}
        addingPhase={addKnockoutPhaseMutation.isPending ? (addKnockoutPhaseMutation.variables ?? null) : null}
        removingPhase={
          removeKnockoutPhaseMutation.isPending ? (removeKnockoutPhaseMutation.variables ?? null) : null
        }
        onOpenChange={setKnockoutPhasesOpen}
        onAdd={(phase) => {
          addKnockoutPhaseMutation.mutate(phase);
        }}
        onRemove={(phase) => {
          removeKnockoutPhaseMutation.mutate(phase);
        }}
      />

      <MatchResultModal
        open={Boolean(resultMatch)}
        readOnly={
          tournamentLocked || resultMatch?.status === "cancelled"
        }
        onOpenChange={(open) => {
          if (!open) setResultMatchId(null);
        }}
        match={resultMatch}
        pairANames={
          resultMatch?.pairAId
            ? (pairPlayerNames[resultMatch.pairAId] ?? ["Pareja A", ""])
            : ["Pareja A", ""]
        }
        pairBNames={
          resultMatch?.pairBId
            ? (pairPlayerNames[resultMatch.pairBId] ?? ["Pareja B", ""])
            : ["Pareja B", ""]
        }
        matchRules={matchRules}
        isSubmitting={submitResult.isPending}
        onSubmit={async (result) => {
          if (!resultMatch) return;
          await submitResult.mutateAsync({ matchId: resultMatch.id, result });
        }}
      />

      <RegistrationDetailModal
        open={detailRow !== null}
        row={detailRow}
        registration={detailRow?.registration ?? null}
        categoryId={categoryId}
        categoryName={category?.name ?? null}
        showAvailability={requirePairAvailability}
        onOpenChange={(open) => {
          if (!open) {
            setDetailRow(null);
            setRequestedPairId(null);
          }
        }}
      />

      {tournament?.clubId ? (
        <ClientDetailModal
          open={Boolean(clientDetailId)}
          clubId={tournament.clubId}
          clientId={clientDetailId}
          onOpenChange={(open) => {
            if (!open) setClientDetailId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  /** Línea secundaria bajo el valor (p. ej. aceptadas que no entraron al cuadro). */
  detail?: string | null;
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{value}</dd>
      {detail ? <dd className="text-xs text-amber-700">{detail}</dd> : null}
    </div>
  );
}
