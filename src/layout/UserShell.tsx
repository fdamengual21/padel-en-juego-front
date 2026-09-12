import { NavLink, Outlet } from "react-router-dom";
import { History, Home, Trophy, User, Medal, type LucideIcon } from "lucide-react";
import { filterByFeature, type FeatureKey } from "@/config/features";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  feature?: FeatureKey;
}

const items: NavItem[] = [
  { to: ROUTES.player.home, label: "Inicio", icon: Home, end: true, feature: "home" },
  {
    to: ROUTES.player.tournaments,
    label: "Torneos",
    icon: Trophy,
    feature: "tournaments",
  },
  { to: ROUTES.player.ranking, label: "Ranking", icon: Medal, feature: "ranking" },
  { to: ROUTES.player.history, label: "Historial", icon: History, feature: "history" },
  { to: ROUTES.player.profile, label: "Perfil", icon: User, feature: "profile" },
];

const gridColsClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

export default function UserShell() {
  const visibleItems = filterByFeature(items);
  const colsClass = gridColsClass[visibleItems.length] ?? "grid-cols-5";

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between bg-card">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            StartPadel
          </p>
          <h1 className="text-lg font-semibold tracking-tight">Jugador</h1>
        </div>
        <NavLink
          to={ROUTES.club.dashboard}
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
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
        <ul className={cn("mx-auto max-w-lg grid", colsClass)}>
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 py-1.5 text-[11px] transition-colors",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg",
                        isActive && "bg-primary text-primary-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
