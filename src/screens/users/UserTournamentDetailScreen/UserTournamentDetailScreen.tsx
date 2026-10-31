import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, GitBranch, Trophy, Users } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import Avatar from "@/components/Avatar";
import TournamentChampionBanner from "@/components/tournaments/TournamentChampionBanner";
import TournamentSummaryCard from "@/components/tournaments/TournamentSummaryCard";
import PlayerRegistrationPanel from "@/components/tournaments/PlayerRegistrationPanel";
import StatusBadge from "@/components/tournaments/StatusBadge";
import TournamentRulesDialog from "@/components/tournaments/TournamentRulesDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canOpenMatchResult,
  championPairNames,
  isQualityPreset,
  resolveTournamentChampionPairId,
  type Match,
} from "@/domain";
import { formatRegisteredAtEs, formatTournamentDayEs } from "@/lib/dates";
import { sidePreferenceLabel } from "@/lib/tournamentLabels";
import { toastError } from "@/lib/toast";
import { ROUTES } from "@/router/routes";
import CuadroBoard from "@/screens/club/ClubTournamentDetailScreen/components/CuadroBoard";
import GroupZonesPanel from "@/screens/club/ClubTournamentDetailScreen/components/GroupZonesPanel";
import MatchResultModal from "@/screens/club/ClubTournamentDetailScreen/components/MatchResultModal";
import PublicParticipantDetailModal from "@/screens/users/components/PublicParticipantDetailModal";
import { toCuadroBoardView } from "./helpers/toCuadroBoardView";
import type { PublicParticipantRow } from "@/modules/tournament-ops/types";

export default function UserTournamentDetailScreen() {
  const { tournamentId = "" } = useParams();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [activeTab, setActiveTab] = useState("grupos");
  const [detailRow, setDetailRow] = useState<PublicParticipantRow | null>(null);
  const [requestedPairId, setRequestedPairId] = useState<string | null>(null);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);

  const pageQuery = useQuery({
    queryKey: ["public-tournament-view", tournamentId, selectedCategoryId],
    queryFn: () =>
      Api.TournamentService().getPublicView(tournamentId, selectedCategoryId || undefined),
    enabled: Boolean(tournamentId),
  });
  const page = pageQuery.data;
  const categoryId = page?.category.id ?? "";
  const tournamentLocked =
    page?.tournament.status === "finished" || page?.tournament.status === "cancelled";

  const zonesQuery = useQuery({
    queryKey: ["public-zones-board", categoryId],
    queryFn: () => Api.TournamentOpsService().getPublicZonesBoard(categoryId),
    enabled:
      Boolean(categoryId) &&
      (activeTab === "grupos" || page?.tournament.status === "finished"),
  });
  const participantsQuery = useQuery({
    queryKey: ["public-participants-board", categoryId],
    queryFn: () => Api.TournamentOpsService().getPublicParticipantsBoard(categoryId),
    enabled: Boolean(categoryId) && (activeTab === "participantes" || Boolean(requestedPairId)),
  });
  const cuadroQuery = useQuery({
    queryKey: ["public-cuadro-board", categoryId],
    queryFn: () => Api.TournamentOpsService().getPublicCuadroBoard(categoryId),
    enabled:
      Boolean(categoryId) &&
      (activeTab === "cuadro" || page?.tournament.status === "finished"),
  });
  const repechageQuery = useQuery({
    queryKey: ["public-repechage-board", categoryId],
    queryFn: () => Api.TournamentOpsService().getPublicRepechageBoard(categoryId),
    enabled: Boolean(categoryId) && page?.repechageCreated === true && activeTab === "repechaje",
  });

  useEffect(() => {
    if (!requestedPairId || participantsQuery.isFetching) return;
    if (participantsQuery.isError) {
      setRequestedPairId(null);
      toastError(
        "No se pudo abrir la inscripción",
        participantsQuery.error instanceof Error ? participantsQuery.error.message : undefined,
      );
      return;
    }
    const board = participantsQuery.data;
    if (!board) return;
    const row = board.rows.find((item) => item.pairId === requestedPairId) ?? null;
    setRequestedPairId(null);
    if (row) setDetailRow(row);
    else toastError("No se encontró la inscripción de esa pareja.");
  }, [
    requestedPairId,
    participantsQuery.isFetching,
    participantsQuery.isError,
    participantsQuery.error,
    participantsQuery.data,
  ]);

  const openPairDetail = (pairId: string) => {
    const row = participantsQuery.data?.rows.find((item) => item.pairId === pairId);
    if (row) {
      setDetailRow(row);
      return;
    }
    setRequestedPairId(pairId);
  };

  const openResult = (match: Match) => {
    if (!canOpenMatchResult(match, false)) return;
    setResultMatch(match);
  };

  const pairPlayerNames =
    zonesQuery.data?.pairPlayerNames ??
    cuadroQuery.data?.pairPlayerNames ??
    repechageQuery.data?.pairPlayerNames ??
    {};

  if (pageQuery.isLoading) {
    return <p className="p-4 text-muted-foreground md:p-0">Cargando torneo…</p>;
  }
  if (pageQuery.isError || !page) {
    return (
      <div className="p-4 md:p-0">
        <EmptyState
          icon={CircleAlert}
          tone="error"
          title="No se pudo cargar el torneo"
          description={
            pageQuery.error instanceof Error
              ? pageQuery.error.message
              : "Probá de nuevo en un momento."
          }
        />
      </div>
    );
  }

  const { tournament, summary, category } = page;
  const championPairId =
    tournament.status === "finished"
      ? resolveTournamentChampionPairId({
          elimMatches: cuadroQuery.data?.elimMatches ?? [],
          groups: zonesQuery.data?.groups ?? cuadroQuery.data?.groups ?? [],
          standings: zonesQuery.data?.standings ?? [],
          finishedGroupIds: zonesQuery.data?.finishedGroupIds,
        })
      : null;
  const championNames = championPairId
    ? championPairNames(
        championPairId,
        pairPlayerNames,
        zonesQuery.data?.pairLabels ?? cuadroQuery.data?.pairLabels ?? {},
      )
    : null;
  const championAvatars = participantsQuery.data?.rows.find(
    (row) => row.pairId === championPairId,
  )?.playerAvatars;
  const dates =
    tournament.endDate && tournament.endDate !== tournament.startDate
      ? `${formatTournamentDayEs(tournament.startDate)} → ${formatTournamentDayEs(tournament.endDate)}`
      : formatTournamentDayEs(tournament.startDate);

  return (
    <div className="space-y-5 p-4 md:p-0" data-testid="player-tournament-detail">
      <div>
        <Link to={ROUTES.player.tournaments} className="text-sm text-sidebar hover:underline">
          ← Volver a torneos
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{tournament.name}</h2>
            <StatusBadge status={tournament.status} />
            <TournamentRulesDialog
              format={tournament.format}
              matchRules={page.matchRules}
              categoryName={category.name}
            />
            {page.categories.length > 1 ? (
              <select
                aria-label="Categoría"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={categoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
              >
                {page.categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="ml-auto flex w-full max-w-xl items-center sm:w-auto">
            <PlayerRegistrationPanel
              tournament={tournament}
              categories={page.categories}
              categoryId={categoryId}
              quotaFull={page.quotaFull}
              omitAvailability={isQualityPreset(page.preset)}
              onCategoryChange={setSelectedCategoryId}
            />
          </div>
        </div>
      </div>

      {championPairId && championNames ? (
        <TournamentChampionBanner
          names={championNames}
          avatars={championAvatars}
          onOpen={() => openPairDetail(championPairId)}
        />
      ) : null}

      <TournamentSummaryCard
        bannerUrl={tournament.bannerUrl}
        fallbackName={tournament.name}
        description={tournament.description}
        contactPhone={tournament.clubPhone}
        stats={[
          { kind: "category", label: "Categoría", value: category.name },
          {
            kind: "pairs",
            label: page.tournamentStarted ? "En cuadro" : "Aceptados",
            value: `${summary.pairCount} parejas`,
          },
          {
            kind: "fee",
            label: "Inscripción",
            value:
              tournament.registrationFee > 0
                ? `$ ${tournament.registrationFee.toLocaleString("es-AR")}`
                : "Sin cargo",
          },
          {
            kind: "circuit",
            label: "Circuito",
            value: category.circuitType === "CICUPA" ? "CICUPA" : "Sin circuito",
          },
          {
            kind: "zones",
            label: "Zonas",
            value: summary.zones
              ? summary.qualify > 0
                ? `${summary.zones} · clasifican ${summary.qualify}`
                : `${summary.zones}`
              : "Pendiente de cupo",
          },
          {
            kind: "matches",
            label: "Partidos",
            value: `${summary.liveCount} en juego · ${summary.finishedCount} finalizados`,
          },
          { kind: "dates", label: "Fechas", value: dates },
        ]}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))}>
        <div className="min-w-0 overflow-x-auto">
          <TabsList className="h-8 w-max min-w-full">
            <TabsTrigger value="grupos" className="flex-none">
              Zonas
            </TabsTrigger>
            <TabsTrigger value="participantes" className="flex-none">
              Participantes
            </TabsTrigger>
            <TabsTrigger value="cuadro" className="flex-none">
              Cuadro
            </TabsTrigger>
            {page.repechageCreated ? (
              <TabsTrigger value="repechaje" className="flex-none">
                Repechaje
              </TabsTrigger>
            ) : null}
          </TabsList>
        </div>

        <TabsContent value="grupos" className="space-y-4 pt-4">
          {zonesQuery.data?.notice ? (
            <p className="text-sm text-muted-foreground">{zonesQuery.data.notice}</p>
          ) : null}
          {zonesQuery.data ? (
            <GroupZonesPanel
              groups={zonesQuery.data.groups}
              matches={zonesQuery.data.groupMatches}
              standings={zonesQuery.data.standings}
              pairLabels={zonesQuery.data.pairLabels}
              pairPlayerNames={zonesQuery.data.pairPlayerNames}
              matchRules={zonesQuery.data.matchRules}
              allMatches={zonesQuery.data.allMatches}
              slots={zonesQuery.data.slots}
              finishedGroupIds={zonesQuery.data.finishedGroupIds}
              tournamentLocked
              onOpenResult={openResult}
              onOpenPair={openPairDetail}
              unresolvedTies={zonesQuery.data.unresolvedTies}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Cargando zonas…</p>
          )}
        </TabsContent>

        <TabsContent value="participantes" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">Parejas inscriptas en la categoría.</p>
          {participantsQuery.data?.notice ? (
            <p className="text-sm text-muted-foreground">{participantsQuery.data.notice}</p>
          ) : null}
          {participantsQuery.data ? (
            participantsQuery.data.rows.length ? (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {participantsQuery.data.rows.map((row) => (
                  <li
                    key={row.pairId}
                    data-testid="participant-card"
                    className="flex cursor-pointer flex-col gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => setDetailRow(row)}
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar
                            name={row.playerNames[0]}
                            imageUrl={row.playerAvatars[0]}
                            size="sm"
                            alt={row.playerNames[0]}
                          />
                          <span className="truncate font-medium">{row.playerNames[0]}</span>
                        </div>
                        <div className="flex min-w-0 items-center gap-2">
                          {row.incomplete ? (
                            <span className="text-muted-foreground">
                              Buscando pareja ({sidePreferenceLabel(row.sidePreference)})
                            </span>
                          ) : (
                            <>
                              <Avatar
                                name={row.playerNames[1]}
                                imageUrl={row.playerAvatars[1]}
                                size="sm"
                                alt={row.playerNames[1]}
                              />
                              <span className="truncate font-medium">{row.playerNames[1]}</span>
                            </>
                          )}
                        </div>
                        {row.disqualified ? <StatusBadge status="disqualified" /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {row.registeredAt
                          ? formatRegisteredAtEs(row.registeredAt)
                          : "Sin fecha de inscripción"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Users}
                title="Todavía no hay parejas inscriptas"
                description="Cuando el club acepte inscripciones, van a aparecer acá."
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">Cargando participantes…</p>
          )}
        </TabsContent>

        <TabsContent value="cuadro" className="space-y-4 pt-4">
          {cuadroQuery.data ? (
            <CuadroBoard
              board={toCuadroBoardView(cuadroQuery.data)}
              isLoading={cuadroQuery.isFetching}
              onOpenResult={openResult}
              onOpenPair={openPairDetail}
              readOnly
              tournamentStarted={page.tournamentStarted}
              tournamentLocked={tournamentLocked}
            />
          ) : cuadroQuery.isFetching ? (
            <p className="text-sm text-muted-foreground">Cargando cuadro…</p>
          ) : (
            <EmptyState
              icon={GitBranch}
              title="Todavía no hay cuadro"
              description="Se completa cuando haya parejas inscriptas y zonas armadas."
            />
          )}
        </TabsContent>

        {page.repechageCreated ? (
          <TabsContent value="repechaje" className="space-y-4 pt-4">
            {repechageQuery.data?.notice ? (
              <p className="text-sm text-muted-foreground">{repechageQuery.data.notice}</p>
            ) : null}
            {repechageQuery.data &&
            (repechageQuery.data.groups.length > 0 || repechageQuery.data.elimMatches.length > 0) ? (
              <>
                <GroupZonesPanel
                  groups={repechageQuery.data.groups}
                  matches={repechageQuery.data.groupMatches}
                  standings={repechageQuery.data.standings}
                  pairLabels={repechageQuery.data.pairLabels}
                  pairPlayerNames={repechageQuery.data.pairPlayerNames}
                  matchRules={repechageQuery.data.matchRules}
                  allMatches={repechageQuery.data.allMatches}
                  slots={repechageQuery.data.slots}
                  finishedGroupIds={repechageQuery.data.finishedGroupIds}
                  tournamentLocked
                  onOpenResult={openResult}
                  onOpenPair={openPairDetail}
                  unresolvedTies={repechageQuery.data.unresolvedTies}
                />
                <CuadroBoard
                  board={toCuadroBoardView(repechageQuery.data)}
                  isLoading={repechageQuery.isFetching}
                  onOpenResult={openResult}
                  onOpenPair={openPairDetail}
                  readOnly
                  tournamentStarted={page.tournamentStarted}
                  tournamentLocked={tournamentLocked}
                />
              </>
            ) : repechageQuery.isFetching ? (
              <p className="text-sm text-muted-foreground">Cargando repechaje…</p>
            ) : (
              <EmptyState
                icon={Trophy}
                title="Todavía no hay parejas en el repechaje"
                description="Cuando el club arme este subcuadro, vas a verlo acá."
              />
            )}
          </TabsContent>
        ) : null}
      </Tabs>

      <MatchResultModal
        open={Boolean(resultMatch)}
        readOnly
        onOpenChange={(open) => {
          if (!open) setResultMatch(null);
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
        matchRules={page.matchRules}
        onSubmit={() => undefined}
      />

      <PublicParticipantDetailModal
        open={detailRow !== null}
        row={detailRow}
        categoryId={categoryId}
        categoryName={category.name}
        onOpenChange={(open) => {
          if (!open) {
            setDetailRow(null);
            setRequestedPairId(null);
          }
        }}
      />
    </div>
  );
}
