import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useMockSession } from "@/app/MockSessionProvider";
import RequirePlayerAuth from "@/components/auth/RequirePlayerAuth";
import { ROUTES } from "@/router/routes";
import PlayerAccountPanel from "./components/PlayerAccountPanel";

export default function UserAccountScreen() {
  const { player } = useMockSession();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-10 md:p-0 md:pb-10" data-testid="player-account">
      <div className="space-y-1">
        <Link
          to={ROUTES.player.profile}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver al perfil
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">Mi cuenta</h2>
        <p className="text-sm text-muted-foreground">Tus datos personales y cómo te ven otros jugadores.</p>
      </div>

      <RequirePlayerAuth nextPath={ROUTES.player.account} actionLabel="Editar tu cuenta">
        {player ? <PlayerAccountPanel player={player} /> : null}
      </RequirePlayerAuth>
    </div>
  );
}
