import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatCategoryLevel } from "@core-api";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { FeatureGuard } from "@/components/guards";
import TournamentCard from "@/components/tournaments/TournamentCard";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

export default function EntryScreen() {
  const { clubId, enterAsGuest } = useMockSession();
  const { data: club } = useQuery({
    queryKey: ["club", clubId],
    queryFn: () => Api.ClubService().getById(clubId),
  });

  return (
    <div className="min-h-svh flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div>
          <p className="text-sm text-muted-foreground mb-2">StartPadel</p>
          <h1 className="text-4xl font-semibold tracking-tight">Torneos de pádel</h1>
          <p className="mt-3 text-muted-foreground">
            {club?.name ?? "Club demo"} · MVP en memoria
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to={ROUTES.player.home}
            className={cn(buttonVariants(), "h-12")}
            onClick={() => enterAsGuest()}
            data-testid="entry-player-guest"
          >
            Explorar como jugador
          </Link>
          <Link
            to={ROUTES.club.dashboard}
            className={cn(buttonVariants({ variant: "outline" }), "h-12")}
          >
            Entrar como club
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <Link
            to={ROUTES.auth.login}
            className="font-medium underline-offset-4 hover:underline"
            data-testid="entry-login"
          >
            Ingresar
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            to={ROUTES.auth.register}
            className="font-medium underline-offset-4 hover:underline"
            data-testid="entry-register"
          >
            Crear cuenta
          </Link>
        </div>
        <FeatureGuard feature="tournaments">
          <TournamentPreview />
        </FeatureGuard>
      </div>
    </div>
  );
}

function TournamentPreview() {
  const { clubId } = useMockSession();
  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments", clubId],
    queryFn: () => Api.TournamentService().list(clubId),
  });
  const first = tournaments[0];
  if (!first) return null;
  return (
    <TournamentCard
      tournament={first}
      categoryLabel={`${formatCategoryLevel(6)} Masculino`}
      pairsCount={8}
      to={ROUTES.club.tournamentDetail(first.id)}
    />
  );
}
