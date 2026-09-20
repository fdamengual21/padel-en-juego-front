import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { emptyPlayerDashboard } from "@/modules/auth";
import RequirePlayerAuth from "@/components/auth/RequirePlayerAuth";
import MatchCard from "@/components/tournaments/MatchCard";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import TournamentHistoryCard from "./components/TournamentHistoryCard";

export default function UserHistoryScreen() {
  const { playerId, player, hasApiSession } = useMockSession();
  const { data, isLoading } = useQuery({
    queryKey: ["player-home", playerId],
    queryFn: () => Api.TournamentOpsService().getPlayerHome(playerId!),
    enabled: Boolean(playerId) && !hasApiSession,
  });
  const dashboard =
    hasApiSession && player ? emptyPlayerDashboard(player) : data;

  return (
    <div className="space-y-4 p-4" data-testid="player-history">
      <h2 className="text-2xl font-semibold tracking-tight">Historial</h2>

      <RequirePlayerAuth
        nextPath={ROUTES.player.history}
        actionLabel="Ver tu historial"
      >
        {isLoading || !dashboard ? (
          <p className="text-sm text-muted-foreground">Cargando historial…</p>
        ) : (
          <Tabs defaultValue="tournaments">
            <TabsList className="w-full">
              <TabsTrigger value="tournaments" className="flex-1">
                Torneos
              </TabsTrigger>
              <TabsTrigger value="matches" className="flex-1">
                Partidos recientes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tournaments" className="mt-3 space-y-3">
              {dashboard.tournaments.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Todavía no jugaste torneos.
                  </p>
                  <Link
                    to={ROUTES.player.tournaments}
                    className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                  >
                    Ver torneos
                  </Link>
                </div>
              ) : (
                dashboard.tournaments.map((entry) => (
                  <TournamentHistoryCard
                    key={`${entry.tournamentId}-${entry.categoryId}-${entry.pairId}`}
                    entry={entry}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="matches" className="mt-3 space-y-3">
              {dashboard.recentMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin partidos finalizados.
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
            </TabsContent>
          </Tabs>
        )}
      </RequirePlayerAuth>
    </div>
  );
}
