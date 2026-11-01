import type { ReactNode } from "react";
import { CalendarDays, Settings2, Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import HomeTournamentCard from "@/components/tournaments/HomeTournamentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TournamentStatus } from "@/domain";
import { cn } from "@/lib/utils";
import type { ClubRankingCircuit } from "@/modules/rankings";
import RankingHero from "./RankingHero";
import RankingStandingsTable, { type RankingStandingsSource } from "./RankingStandingsTable";
import RankingSummaryStrip from "./RankingSummaryStrip";

export type RankingDetailTab = "ranking" | "fechas" | "config";

interface RankingDetailViewProps {
  circuit: ClubRankingCircuit;
  /** De dónde sale la tabla del circuito: sesión del club o ficha pública. */
  standingsSource: RankingStandingsSource;
  tournamentTo: (eventId: string) => string;
  activeTab: RankingDetailTab;
  onTabChange: (tab: RankingDetailTab) => void;
  /** Solo club con permiso de edición. Sin esto no hay tab Configuración. */
  configTab?: ReactNode;
}

/** Detalle del ranking para club y jugador: hero, resumen y tabs. */
export default function RankingDetailView({
  circuit,
  standingsSource,
  tournamentTo,
  activeTab,
  onTabChange,
  configTab,
}: RankingDetailViewProps) {
  const hasConfig = Boolean(configTab);
  const tab = activeTab === "config" && !hasConfig ? "ranking" : activeTab;
  const events = circuit.events ?? [];

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="ranking-detail">
      <RankingHero circuit={circuit} />
      <RankingSummaryStrip circuit={circuit} />

      <Tabs value={tab} onValueChange={(value) => onTabChange(value as RankingDetailTab)}>
        <TabsList
          className={cn(
            "grid h-9! w-full sm:mx-auto sm:flex sm:w-max",
            hasConfig ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <TabsTrigger value="ranking" className="sm:px-4">
            <Trophy />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="fechas" className="sm:px-4">
            <CalendarDays />
            Fechas
          </TabsTrigger>
          {hasConfig ? (
            <TabsTrigger value="config" className="sm:px-4">
              <Settings2 />
              <span className="sm:hidden">Config.</span>
              <span className="hidden sm:inline">Configuración</span>
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="ranking" className="pt-2">
          <RankingStandingsTable key={circuit.id} circuitId={circuit.id} source={standingsSource} />
        </TabsContent>

        <TabsContent value="fechas" className="pt-2">
          {events.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No hay fechas" className="min-h-0 py-10" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2" data-testid="ranking-events">
              {events.map((event) => (
                <HomeTournamentCard
                  key={event.id}
                  to={tournamentTo(event.id)}
                  tournament={{
                    id: event.id,
                    name: event.name,
                    status: event.status as TournamentStatus,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    bannerUrl: event.bannerUrl,
                    clubCoverUrl: circuit.clubCoverUrl ?? null,
                    clubAvatarUrl: circuit.clubAvatarUrl ?? null,
                    clubName: circuit.clubName,
                    categories: [{ id: event.categoryId ?? circuit.id, name: circuit.categoryName }],
                    rankingCircuitId: circuit.id,
                    weekIndex: event.weekIndex,
                    rankingWeekCount: circuit.weekCount,
                    registrationOpensAt: event.registrationOpensAt,
                    visibleFrom: event.visibleFrom ?? null,
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {hasConfig ? (
          <TabsContent value="config" className="pt-2">
            {configTab}
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
