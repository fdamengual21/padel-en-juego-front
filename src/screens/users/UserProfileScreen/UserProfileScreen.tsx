import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";

export default function UserProfileScreen() {
  const navigate = useNavigate();
  const { playerId } = useMockSession();
  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => Api.TournamentOpsService().listPlayers(),
  });
  const player = players.find((p) => p.id === playerId);

  return (
    <div className="p-4 space-y-4" data-testid="player-profile">
      <h2 className="text-2xl font-semibold tracking-tight">Perfil</h2>
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <p className="text-lg font-medium">{player?.displayName ?? "Jugador"}</p>
        <p className="text-sm text-muted-foreground">{player?.phone}</p>
        <p className="text-xs text-muted-foreground">Sesión mock · sin autenticación real</p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => navigate(ROUTES.home)}
      >
        <LogOut className="size-4" />
        Cerrar sesión
      </Button>
    </div>
  );
}
