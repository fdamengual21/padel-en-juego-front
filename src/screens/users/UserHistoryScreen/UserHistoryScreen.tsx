import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Search, Trophy } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import RequirePlayerAuth from "@/components/auth/RequirePlayerAuth";
import { EmptyState } from "@/components/EmptyState";
import MatchCard from "@/components/tournaments/MatchCard";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/useDebounce";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import HomeTournamentCard from "../components/HomeTournamentCard";
import HistoryPagination from "./components/HistoryPagination";

const PAGE_SIZE = 10;

type HistoryTab = "tournaments" | "played";

export default function UserHistoryScreen() {
  const { playerId, hasApiSession } = useMockSession();
  const [tab, setTab] = useState<HistoryTab>("tournaments");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);
  const [pagedSearch, setPagedSearch] = useState(debouncedSearch);
  if (pagedSearch !== debouncedSearch) {
    setPagedSearch(debouncedSearch);
    setPage(1);
  }
  const requestPage = pagedSearch === debouncedSearch ? page : 1;
  const canQuery = Boolean(playerId) && hasApiSession;

  const history = useQuery({
    queryKey: ["player-history", playerId, debouncedSearch, requestPage],
    queryFn: () =>
      Api.TournamentOpsService().getPlayerHistory({
        q: debouncedSearch,
        page: requestPage,
        pageSize: PAGE_SIZE,
      }),
    enabled: canQuery,
  });

  const played = useQuery({
    queryKey: ["player-home", playerId],
    queryFn: () => Api.TournamentOpsService().getPlayerHome(playerId!),
    enabled: canQuery && tab === "played",
  });

  const items = history.data?.items ?? [];
  const totalItems = history.data?.totalItems ?? 0;
  const totalPages = history.data?.totalPages ?? 1;
  const hasSearch = Boolean(debouncedSearch.trim());
  const showLoading = history.isLoading && items.length === 0;
  const showEmpty = !showLoading && !history.isError && totalItems === 0 && !history.isFetching;
  const recentMatches = played.data?.recentMatches ?? [];

  return (
    <div className="space-y-4 p-4" data-testid="player-history">
      <h2 className="text-2xl font-semibold tracking-tight">Historial</h2>

      <RequirePlayerAuth
        nextPath={ROUTES.player.history}
        actionLabel="Ver tu historial"
      >
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value === "played" ? "played" : "tournaments")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="tournaments" className="flex-1">
              Torneos
            </TabsTrigger>
            <TabsTrigger value="played" className="flex-1">
              Partidos y turnos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments" className="mt-3 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="history-search" className="sr-only">
                Buscar por club o torneo
              </label>
              <Input
                id="history-search"
                type="search"
                placeholder="Buscar por club o torneo…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                data-testid="player-history-search"
                className="h-9 pl-8"
              />
            </div>

            {history.isFetching && items.length > 0 ? (
              <p className="text-center text-xs text-muted-foreground">Actualizando…</p>
            ) : null}

            {showLoading ? (
              <p className="text-sm text-muted-foreground">Cargando historial…</p>
            ) : null}

            {history.isError && items.length === 0 ? (
              <EmptyState
                tone="error"
                icon={CircleAlert}
                title="No se pudo cargar tu historial."
              />
            ) : null}

            {showEmpty ? (
              <EmptyState
                icon={hasSearch ? Search : Trophy}
                title={
                  hasSearch
                    ? "No hay torneos que coincidan con la búsqueda."
                    : "Todavía no jugaste torneos."
                }
              >
                {hasSearch ? null : (
                  <Link
                    to={ROUTES.player.tournaments}
                    className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                  >
                    Ver torneos
                  </Link>
                )}
              </EmptyState>
            ) : null}

            {items.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((entry) => (
                  <HomeTournamentCard
                    key={`${entry.id}-${entry.categories[0]?.id ?? "category"}-${entry.pairId ?? "pair"}`}
                    tournament={entry}
                    to={ROUTES.player.tournamentDetail(entry.id)}
                  />
                ))}
              </div>
            ) : null}

            <HistoryPagination
              page={history.data?.page ?? requestPage}
              totalPages={totalPages}
              totalItems={totalItems}
              disabled={history.isFetching}
              onPageChange={setPage}
            />
          </TabsContent>

          <TabsContent value="played" className="mt-3 space-y-3">
            {played.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando partidos…</p>
            ) : played.isError ? (
              <EmptyState
                tone="error"
                icon={CircleAlert}
                title="No se pudieron cargar los partidos."
              />
            ) : recentMatches.length === 0 ? (
              <EmptyState icon={Trophy} title="Sin partidos finalizados." />
            ) : (
              recentMatches.map((item) => (
                <MatchCard
                  key={item.match.id}
                  match={item.match}
                  pairALabel={item.pairALabel}
                  pairBLabel={item.pairBLabel}
                  courtLabel={item.courtLabel}
                  phaseLabel={item.phaseLabel}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </RequirePlayerAuth>
    </div>
  );
}
