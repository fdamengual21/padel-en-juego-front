import { useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { useUser } from "@/app/UserProvider";
import Avatar from "@/components/Avatar";
import { buttonVariants } from "@/components/ui/button";
import { clubRoleLabel } from "@/modules/auth/clubContext";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

export default function EntryScreen() {
  const navigate = useNavigate();
  const { isResolvingUser } = useUser();
  const {
    isAuthenticated,
    hasAssociatedClub,
    clubs,
    selectedClubId,
    enterClub,
    exitClubMode,
  } = useMockSession();

  useEffect(() => {
    exitClubMode();
  }, [exitClubMode]);

  if (isResolvingUser) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Cargando sesión…</p>
      </div>
    );
  }

  if (isAuthenticated && !hasAssociatedClub) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const continueAsPlayer = () => {
    exitClubMode();
    navigate(ROUTES.home);
  };

  const enterAsClub = (clubId: string) => {
    enterClub(clubId);
    navigate(ROUTES.club.dashboard);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Easy padel</p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {isAuthenticated ? "¿Cómo querés entrar?" : "Torneos de pádel"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {isAuthenticated
              ? "Elegí vista de jugador o un club donde sos staff."
              : "Explorá torneos y clubes. Para el backoffice tenés que ingresar."}
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            className={cn(buttonVariants(), "h-12 w-full")}
            data-testid="entry-player-guest"
            onClick={continueAsPlayer}
          >
            {isAuthenticated ? "Continuar como jugador" : "Explorar como jugador"}
          </button>

          {isAuthenticated
            ? clubs.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-auto w-full justify-start gap-3 px-3 py-3 text-left",
                    selectedClubId === club.id && "ring-2 ring-primary",
                  )}
                  onClick={() => enterAsClub(club.id)}
                >
                  <Avatar
                    name={club.name}
                    imageUrl={club.avatarUrl}
                    size="sm"
                    alt={club.name}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{club.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {clubRoleLabel(club.role)}
                    </span>
                  </span>
                </button>
              ))
            : null}
        </div>

        {isAuthenticated ? null : (
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
        )}
      </div>
    </div>
  );
}
