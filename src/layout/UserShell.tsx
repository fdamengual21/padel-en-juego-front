import { NavLink, Outlet } from "react-router-dom";
import { History, Home, Trophy, User, Medal } from "lucide-react";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

const items = [
  { to: ROUTES.player.home, label: "Inicio", icon: Home, end: true },
  { to: ROUTES.player.tournaments, label: "Torneos", icon: Trophy },
  { to: ROUTES.player.ranking, label: "Ranking", icon: Medal },
  { to: ROUTES.player.history, label: "Historial", icon: History },
  { to: ROUTES.player.profile, label: "Perfil", icon: User },
];

export default function UserShell() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">StartPadel</p>
          <h1 className="text-lg font-semibold tracking-tight">Jugador</h1>
        </div>
        <NavLink to={ROUTES.club.dashboard} className="text-sm text-primary underline-offset-4 hover:underline">
          Vista club
        </NavLink>
      </header>
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>
      <nav
        data-testid="player-bottom-nav"
        className="fixed bottom-0 inset-x-0 border-t border-border bg-card/95 backdrop-blur"
      >
        <ul className="grid grid-cols-5 max-w-lg mx-auto">
          {items.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 py-2 text-[11px]",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
