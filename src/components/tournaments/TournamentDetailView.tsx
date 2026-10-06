import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import type {
  Match,
  MatchResultInput,
  MatchRules,
  ParticipantsBoardView,
  TournamentPair,
} from "@/domain";
import {
  createId,
  isMatchResultComplete,
  isQualityPreset,
  resolveMatchDurationMinutes,
} from "@/domain";
import Api from "@/api/Api";
import MatchCard from "@/components/tournaments/MatchCard";
import PlayerRegistrationPanel from "@/components/tournaments/PlayerRegistrationPanel";
import RegistrationDetailModal from "@/components/tournaments/RegistrationDetailModal";
import StatusBadge from "@/components/tournaments/StatusBadge";
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
import WarningDialog from "@/components/ui/warning-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Avatar from "@/components/Avatar";
import ClientDetailModal from "@/screens/club/ClubClientDetailScreen/components/ClientDetailModal";
import CuadroBoard from "@/screens/club/ClubTournamentDetailScreen/components/CuadroBoard";
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
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

/** Quién mira el detalle: club (admin) o jugador/guest (solo lectura). */
export type TournamentDetailAudience = "club" | "player";

interface TournamentDetailViewProps {
  audience: TournamentDetailAudience;
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
  audience,
  tournamentId,
}: TournamentDetailViewProps) {
  const isClub = audience === "club";
  const readOnly = !isClub;
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
  const [editingPair, setEditingPair] = useState<TournamentPair | null>(null);
  const [confirmAddStartedOpen, setConfirmAddStartedOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("grupos");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [clientDetailId, setClientDetailId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<
    ParticipantsBoardView["rows"][number] | null
  >(null);

  const { data: tournament } = useQuery({
    queryKey: ["tournament", tournamentId, isClub],
    queryFn: () =>
      isClub
        ? Api.TournamentService().getById(tournamentId)
        : Api.TournamentService().getPublic(tournamentId),
  });
  const { data: clubCourts = [] } = useQuery({
    queryKey: ["courts", "tournament-form", isClub],
    queryFn: () => Api.CourtService().list(),
    enabled: isClub,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", tournamentId, isClub],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().listCategories(tournamentId)
        : Api.TournamentOpsService().listPublicCategories(tournamentId),
    enabled: Boolean(tournamentId),
  });
  const categoryId = (!isClub && selectedCategoryId) || categories[0]?.id || "";
  const category = categories.find((item) => item.id === categoryId) ?? categories[0];

  const { data: pairs = [] } = useQuery({
    queryKey: ["pairs", categoryId],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().listPairs(categoryId)
        : Api.TournamentOpsService().listPublicPairs(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: registrations = [] } = useQuery({
    queryKey: ["registrations", categoryId],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().listRegistrations(categoryId)
        : Api.TournamentOpsService().listPublicRegistrations(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", categoryId],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().listGroups(categoryId)
        : Api.TournamentOpsService().listPublicGroups(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: matches = [] } = useQuery({
    queryKey: ["matches", categoryId],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().listMatches(categoryId)
        : Api.TournamentOpsService().listPublicMatches(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => Api.TournamentOpsService().listPlayers(),
    enabled: isClub,
  });
  const { data: ruleset } = useQuery({
    queryKey: ["ruleset", categoryId],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().getRuleset(categoryId)
        : Api.TournamentOpsService().getPublicRuleset(categoryId),
    enabled: Boolean(categoryId),
  });
  const { data: courtReservations = [] } = useQuery({
    queryKey: ["court-reservations", tournament?.clubId],
    queryFn: () =>
      Api.TournamentOpsService().listCourtReservations(tournament!.clubId),
    enabled: isClub && Boolean(tournament?.clubId),
  });

  const matchDurationMinutes = resolveMatchDurationMinutes(ruleset?.preset);
  const requirePairAvailability = !isQualityPreset(ruleset?.preset);

  const {
    data: zonesBoard,
    refetch: refetchZonesBoard,
  } = useQuery({
    queryKey: ["zones-board", categoryId],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().getZonesBoard(categoryId)
        : Api.TournamentOpsService().getPublicZonesBoard(categoryId),
    enabled: Boolean(categoryId),
    refetchOnMount: "always",
  });
  const {
    data: participantsBoard,
    refetch: refetchParticipantsBoard,
  } = useQuery({
    queryKey: ["participants-board", categoryId],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().getParticipantsBoard(categoryId)
        : Api.TournamentOpsService().getPublicParticipantsBoard(categoryId),
    enabled: Boolean(categoryId) && activeTab === "participantes",
    refetchOnMount: "always",
  });

  const toastedAutoMatchKeys = useRef(new Set<string>());

  useEffect(() => {
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
  }, [participantsBoard, categoryId, qc]);
  const {
    data: cuadroBoard,
    isFetching: cuadroFetching,
    refetch: refetchCuadro,
  } = useQuery({
    queryKey: ["cuadro", categoryId],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().getCuadroBoard(categoryId)
        : Api.TournamentOpsService().getPublicCuadroBoard(categoryId),
    enabled: Boolean(categoryId) && activeTab === "cuadro",
    refetchOnMount: "always",
  });
  const {
    data: matchesBoard,
    refetch: refetchMatchesBoard,
  } = useQuery({
    queryKey: ["matches-board", categoryId],
    queryFn: () =>
      isClub
        ? Api.TournamentOpsService().getMatchesBoard(categoryId)
        : Api.TournamentOpsService().getPublicMatchesBoard(categoryId),
    enabled: Boolean(categoryId) && activeTab === "partidos",
    refetchOnMount: "always",
  });
  const {
    data: configBoard,
    refetch: refetchConfigBoard,
  } = useQuery({
    queryKey: ["config-board", categoryId],
    queryFn: () => Api.TournamentOpsService().getConfigBoard(categoryId),
    enabled: Boolean(categoryId) && isClub && activeTab === "config",
    refetchOnMount: "always",
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

  const syncMutation = useMutation({
    mutationFn: () => Api.TournamentOpsService().syncCategoryStructure(categoryId),
    onSuccess: async (result) => {
      toastSuccess("Estructura sincronizada", result.message);
      await invalidateOps();
    },
    onError: (err: Error) => {
      toastError("No se pudo sincronizar", err.message);
    },
  });

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
      } else {
        toastSuccess(vars.mode === "edit" ? "Pareja actualizada" : "Inscripción aceptada");
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
    if (!categoryId || !isClub) return;
    void Api.TournamentOpsService()
      .syncCategoryStructure(categoryId)
      .then(async () => {
        await invalidateOps();
      });
    // Sync once when category is ready / registrations already seeded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, registrations.length, isClub]);

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

  const playersById = useMemo(() => {
    const map: Record<string, (typeof players)[number]> = {};
    for (const p of players) map[p.id] = p;
    return map;
  }, [players]);

  const submitResult = useMutation({
    mutationFn: (input: { matchId: string; result: MatchResultInput }) =>
      Api.TournamentOpsService().submitMatchResult(input.matchId, input.result),
    onSuccess: async () => {
      toastSuccess("Resultado cargado");
      await invalidateOps();
      await Api.TournamentOpsService().syncCategoryStructure(categoryId);
      await invalidateOps();
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

  const saveConfig = useMutation({
    mutationFn: async (input: {
      values: TournamentFormValues;
      preserveResults?: boolean;
    }) => {
      const { values, preserveResults } = input;
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
        courtHoldStartTime:
          values.format === "QUALITY" && values.courtHoldCourtIds.length > 0
            ? values.courtHoldStartTime
            : "",
        courtHoldEndTime:
          values.format === "QUALITY" && values.courtHoldCourtIds.length > 0
            ? values.courtHoldEndTime
            : "",
        courtHoldCourtIds: values.format === "QUALITY" ? values.courtHoldCourtIds : [],
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
      return Api.TournamentOpsService().syncCategoryStructure(cfgCategory.id, {
        preserveResults,
        rescheduleAuto: true,
      });
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

  const accepted = registrations.filter((r) => r.status === "ACCEPTED").length;
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
  const structureLocked =
    configBoard?.structureLocked ??
    matches.some(
      (m) =>
        m.phase === "GROUP" &&
        (m.status === "finished" || m.status === "walkover" || m.status === "inProgress"),
    );
  const tournamentStarted =
    participantsBoard?.tournamentStarted ??
    (tournament.status === "inProgress" ||
      tournament.status === "finished" ||
      structureLocked);
  const tournamentLocked =
    tournament.status === "finished" || tournament.status === "cancelled";
  const resultMatch = resultMatchId
    ? (matches.find((m) => m.id === resultMatchId) ??
        zonesBoard?.allMatches.find((m) => m.id === resultMatchId) ??
        matchesBoard?.groupMatches.find((m) => m.id === resultMatchId) ??
        matchesBoard?.elimMatches.find((m) => m.id === resultMatchId) ??
        cuadroBoard?.elimMatches.find((m) => m.id === resultMatchId) ??
        null)
    : null;

  const openAddPair = () => {
    setEditingPair(null);
    if (tournamentStarted) {
      setConfirmAddStartedOpen(true);
      return;
    }
    setPairModalOpen(true);
  };

  const refreshTab = async (tab: string) => {
    if (
      isClub &&
      categoryId &&
      (tab === "grupos" || tab === "cuadro" || tab === "partidos")
    ) {
      await Api.TournamentOpsService().syncCategoryStructure(categoryId);
    }
    await invalidateOps();
    if (tab === "grupos") await refetchZonesBoard();
    if (tab === "participantes") await refetchParticipantsBoard();
    if (tab === "cuadro") await refetchCuadro();
    if (tab === "partidos") await refetchMatchesBoard();
    if (tab === "config" && isClub) await refetchConfigBoard();
  };

  const openResult = (match: Match) => {
    if (readOnly) return;
    if (!match.pairAId || !match.pairBId) return;
    if (tournamentLocked) {
      toastError(
        tournament.status === "cancelled"
          ? "No se puede modificar un partido de un torneo cancelado."
          : "No se puede modificar un partido de un torneo finalizado.",
      );
      return;
    }
    if (match.status === "cancelled") {
      toastError("No se puede modificar un partido cancelado.");
      return;
    }
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
    dailyEndTime: formSource.tournament.dailyEndTime ?? "22:00",
    courtHoldStartTime: formSource.tournament.courtHoldStartTime || "18:00",
    courtHoldEndTime: formSource.tournament.courtHoldEndTime || "22:00",
    courtHoldCourtIds: formSource.tournament.courtHoldCourtIds ?? [],
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

  return (
    <div
      className="space-y-5"
      data-testid={isClub ? "club-tournament-detail" : "player-tournament-detail"}
    >
      <div>
        <Link
          to={isClub ? ROUTES.club.tournaments : ROUTES.player.tournaments}
          className="text-sm text-sidebar hover:underline"
        >
          ← Volver a torneos
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{tournament.name}</h2>
            <StatusBadge status={tournament.status} />
            {readOnly && categories.length > 1 ? (
              <select
                aria-label="Categoría"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={categoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-muted-foreground">{category?.name}</span>
            )}
          </div>
          {readOnly ? (
            <div className="ml-auto flex w-full max-w-xl items-center sm:w-auto">
              <PlayerRegistrationPanel
                tournament={tournament}
                categories={categories}
                categoryId={categoryId}
                onCategoryChange={setSelectedCategoryId}
              />
            </div>
          ) : (
            <AutoAssignButton
              blockedReason={
                zonesBoard
                  ? zonesBoard.autoAssign.blockedReason
                  : "Cargando la fase…"
              }
              pending={scheduleMutation.isPending}
              onOpen={() => setAssignOpen(true)}
            />
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
          <SummaryStat label="Aceptados" value={`${accepted} parejas`} />
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
        onValueChange={(value) => {
          const next = String(value);
          setActiveTab(next);
          void refreshTab(next);
        }}
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="grupos">Zonas</TabsTrigger>
          <TabsTrigger value="participantes">Participantes</TabsTrigger>
          <TabsTrigger value="cuadro">Cuadro</TabsTrigger>
          <TabsTrigger value="partidos">Partidos</TabsTrigger>
          {isClub ? (
            <TabsTrigger value="config">Configuración</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="participantes" className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {isClub
                ? "Inscripciones de la categoría. Podés cargar parejas completas o un jugador solo."
                : "Parejas inscriptas en la categoría."}
            </p>
            {isClub ? (
              <Button type="button" size="sm" onClick={openAddPair}>
                Agregar pareja
              </Button>
            ) : null}
          </div>
          {participantsBoard?.notice ? (
            <p className="text-sm text-muted-foreground">{participantsBoard.notice}</p>
          ) : null}
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {(participantsBoard?.rows ?? [])
              .filter(
                (row) =>
                  isClub || row.registration?.status === "ACCEPTED",
              )
              .map((row) => {
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
                        const clickable = isClub && Boolean(player.clientId);
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
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Orden {pair.seed ?? "—"}
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
                    {isClub &&
                    (reg?.status === "PENDING" || reg?.status === "WAITLIST") ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={acceptMutation.isPending}
                          onClick={() => acceptMutation.mutate(reg.id)}
                        >
                          Aceptar
                        </Button>
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
                    {isClub &&
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
                    {isClub && !row.disqualified && reg?.status === "ACCEPTED" ? (
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
                    {isClub &&
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
          {isClub ? (
            <>
              <p className="text-xs text-muted-foreground">
                Las parejas que carga el club quedan aceptadas. Solo las
                completas entran al armado de zonas y partidos.
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
              finishedGroupIds={zonesBoard.finishedGroupIds}
              tournamentLocked={tournamentLocked || readOnly}
              scheduleSavingMatchId={
                isClub && saveSchedule.isPending
                  ? (saveSchedule.variables?.matchId ?? null)
                  : null
              }
              onSaveSchedule={
                isClub
                  ? async (input) => {
                      await saveSchedule.mutateAsync(input);
                    }
                  : undefined
              }
              onOpenResult={openResult}
              statusSavingMatchId={
                isClub && setLive.isPending
                  ? (setLive.variables?.matchId ?? null)
                  : null
              }
              onSetStatus={
                isClub
                  ? async (input) => {
                      await setLive.mutateAsync(input);
                    }
                  : undefined
              }
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
              readOnly={readOnly}
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
            {(matchesBoard?.groupMatches ?? []).map((match) => (
              <div key={match.id} className="space-y-2">
                {readOnly ? (
                  <MatchCard
                    match={match}
                    pairALabel={
                      (matchesBoard?.pairLabels ?? pairLabels)[match.pairAId ?? ""] ??
                      "A"
                    }
                    pairBLabel={
                      (matchesBoard?.pairLabels ?? pairLabels)[match.pairBId ?? ""] ??
                      "B"
                    }
                    phaseLabel="Zonas"
                    courtLabel={
                      match.courtId
                        ? (matchesBoard?.courtLabels[match.courtId] ?? null)
                        : null
                    }
                  />
                ) : (
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => openResult(match)}
                    disabled={!match.pairAId || !match.pairBId}
                  >
                    <MatchCard
                      match={match}
                      pairALabel={
                        (matchesBoard?.pairLabels ?? pairLabels)[match.pairAId ?? ""] ??
                        "A"
                      }
                      pairBLabel={
                        (matchesBoard?.pairLabels ?? pairLabels)[match.pairBId ?? ""] ??
                        "B"
                      }
                      phaseLabel="Zonas"
                      courtLabel={
                        match.courtId
                          ? (matchesBoard?.courtLabels[match.courtId] ?? null)
                          : null
                      }
                    />
                  </button>
                )}
                {isClub &&
                match.status === "scheduled" &&
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
                {isClub && match.status === "inProgress" && !tournamentLocked ? (
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
            ))}
          </div>
          {!matchesBoard ? (
            <p className="text-sm text-muted-foreground">Cargando partidos…</p>
          ) : matchesBoard.groupMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin partidos de zonas todavía.</p>
          ) : null}
        </TabsContent>

        {isClub ? (
        <TabsContent value="config" className="pt-4 space-y-3">
          {configBoard?.notice ? (
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
              onSubmit={async (values) => {
                const datesTouched =
                  formInitial.startDate !== values.startDate ||
                  formInitial.endDate !== values.endDate;
                const played = matches.some(
                  (match) =>
                    match.status === "finished" ||
                    match.status === "walkover" ||
                    match.status === "inProgress",
                );
                if (datesTouched && tournamentLocked) {
                  toastError(
                    "No se puede cambiar la fecha",
                    "El torneo ya está cerrado.",
                  );
                  return;
                }
                if (datesTouched && played) {
                  setPendingDateValues(values);
                  return;
                }
                await saveConfig.mutateAsync({
                  values,
                  preserveResults: true,
                });
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Cargando configuración…</p>
          )}
        </TabsContent>
        ) : null}
      </Tabs>

      <Dialog
        open={isClub && Boolean(pendingDateValues)}
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
                void saveConfig.mutateAsync({
                  values: pendingDateValues,
                  preserveResults: true,
                });
              }}
            >
              Cambiar fecha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isClub && Boolean(dqRegistrationId)}
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
        open={isClub && Boolean(removeRegistrationId)}
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
        open={isClub && confirmAddStartedOpen}
        onOpenChange={setConfirmAddStartedOpen}
        title="Torneo en curso"
        description="El torneo ya comenzó, ¿seguro que desea agregar una pareja? Se rearmará la estructura conservando resultados ya jugados cuando sea posible."
        cancelLabel="No"
        confirmLabel="Sí"
        onConfirm={() => {
          setConfirmAddStartedOpen(false);
          setEditingPair(null);
          setPairModalOpen(true);
        }}
      />

      <Dialog
        open={isClub && assignOpen}
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
              disabled={scheduleMutation.isPending || !categoryId}
              onClick={() => scheduleMutation.mutate()}
            >
              {scheduleMutation.isPending ? "Asignando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PairFormModal
        open={isClub && pairModalOpen}
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
        playersById={playersById}
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

      <MatchResultModal
        open={isClub && Boolean(resultMatch)}
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
        categoryName={category?.name ?? null}
        showAvailability={isClub && requirePairAvailability}
        onOpenChange={(open) => {
          if (!open) setDetailRow(null);
        }}
      />

      {isClub && tournament?.clubId ? (
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}
