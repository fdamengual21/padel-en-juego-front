import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { emptyPlayerDashboard } from "@/modules/auth";
import RequirePlayerAuth from "@/components/auth/RequirePlayerAuth";
import MatchCard from "@/components/tournaments/MatchCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/router/routes";
import PlayerAccountPanel from "./components/PlayerAccountPanel";
import PlayerHomeHeader from "./components/PlayerHomeHeader";
import PlayerHomeStats from "./components/PlayerHomeStats";

type ProfileTab = "resumen" | "cuenta";

function parseTab(value: string | null): ProfileTab {
  return value === "cuenta" ? "cuenta" : "resumen";
}

export default function UserProfileScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const { playerId, player, hasApiSession } = useMockSession();
  const { data, isLoading } = useQuery({
    queryKey: ["player-home", playerId],
    queryFn: () => Api.TournamentOpsService().getPlayerHome(playerId!),
    enabled: Boolean(playerId) && !hasApiSession,
  });
  const dashboard =
    hasApiSession && player ? emptyPlayerDashboard(player) : data;

  const setTab = (tab: string | number | null) => {
    const next = parseTab(tab == null ? null : String(tab));
    if (next === "resumen") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: next }, { replace: true });
    }
  };

  return (
    <div className="space-y-4 p-4 pb-10 md:p-0 md:pb-10" data-testid="player-profile">
      <h2 className="text-2xl font-semibold tracking-tight md:hidden">Perfil</h2>

      <RequirePlayerAuth
        nextPath={ROUTES.player.profile}
        actionLabel="Ver tu perfil"
      >
        {isLoading || !dashboard ? (
          <p className="text-sm text-muted-foreground">Cargando perfil…</p>
        ) : (
          <>
            <div className="sticky top-0 z-20 -mx-4 bg-background px-4 pb-3 md:mx-0 md:px-0 md:pb-4">
              <PlayerHomeHeader data={dashboard} />
            </div>

            <Tabs value={activeTab} onValueChange={setTab}>
              <TabsList className="w-full max-w-md">
                <TabsTrigger value="resumen" className="flex-1">
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="cuenta" className="flex-1">
                  Cuenta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resumen" className="mt-4 space-y-4">
                <PlayerHomeStats
                  matchesPlayed={dashboard.matchesPlayed}
                  tournamentsCount={dashboard.tournamentsCount}
                  tournamentsWon={dashboard.tournamentsWon}
                  matchesWon={dashboard.matchesWon}
                  matchesLost={dashboard.matchesLost}
                />

                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground">
                      Próximo partido
                    </h3>
                    <Link
                      to={ROUTES.player.history}
                      className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Ver historial
                    </Link>
                  </div>
                  {dashboard.nextMatch ? (
                    <MatchCard
                      match={dashboard.nextMatch.match}
                      pairALabel={dashboard.nextMatch.pairALabel}
                      pairBLabel={dashboard.nextMatch.pairBLabel}
                      courtLabel={dashboard.nextMatch.courtLabel}
                      phaseLabel={dashboard.nextMatch.phaseLabel}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tenés partidos pendientes.
                    </p>
                  )}
                </section>

                <section className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground">
                      Resultados recientes
                    </h3>
                    <Link
                      to={ROUTES.player.tournaments}
                      className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Ver torneos
                    </Link>
                  </div>
                  {dashboard.recentMatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Todavía no hay partidos finalizados.
                    </p>
                  ) : (
                    dashboard.recentMatches.map((item) => (
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
                </section>
              </TabsContent>

              <TabsContent value="cuenta" className="mt-4">
                <PlayerAccountPanel player={dashboard.player} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </RequirePlayerAuth>
    </div>
  );
}
