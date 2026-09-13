import { Link, NavLink, Outlet } from "react-router-dom";
import {
  History,
  Home,
  LogOut,
  Medal,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { useMockSession } from "@/app/MockSessionProvider";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { filterByFeature, type FeatureKey } from "@/config/features";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  feature?: FeatureKey;
  /** Solo visible con sesión de jugador. */
  authOnly?: boolean;
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
  {
    to: ROUTES.player.history,
    label: "Historial",
    icon: History,
    feature: "history",
    authOnly: true,
  },
  {
    to: ROUTES.player.profile,
    label: "Perfil",
    icon: User,
    feature: "profile",
  },
];

const gridColsClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

export default function UserShell() {
  const { isAuthenticated, player, logout } = useMockSession();
  const visibleItems = filterByFeature(items).filter(
    (item) => !item.authOnly || isAuthenticated,
  );
  const colsClass = gridColsClass[visibleItems.length] ?? "grid-cols-5";
  const displayName = isAuthenticated
    ? player?.displayName ?? "Jugador"
    : "Explorar";

  return (
    <div className="min-h-svh bg-background text-foreground flex">
      {/* Sidebar jugador: light, distinto del navy del club */}
      <aside
        data-testid="player-sidebar"
        className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r border-border bg-card text-foreground md:flex"
      >
        <div className="border-b border-border px-4 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            StartPadel
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Jugador</h1>
        </div>
        <nav className="space-y-1 p-3">
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon className="size-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar
              name={displayName}
              imageUrl={player?.avatarUrl}
              size="sm"
              alt={displayName}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {isAuthenticated ? "Cuenta" : "Sin sesión"}
              </p>
            </div>
          </div>
          <NavLink
            to={ROUTES.club.dashboard}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Vista club
          </NavLink>
          {isAuthenticated ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start gap-2 px-3 text-muted-foreground"
              onClick={() => logout()}
              data-testid="player-logout"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          ) : (
            <Link
              to={ROUTES.auth.login}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              data-testid="player-header-login"
            >
              Ingresar
            </Link>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              StartPadel
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {displayName}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            {isAuthenticated ? (
              <button
                type="button"
                className="font-medium text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => logout()}
              >
                Cerrar sesión
              </button>
            ) : (
              <Link
                to={ROUTES.auth.login}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Ingresar
              </Link>
            )}
            <NavLink
              to={ROUTES.club.dashboard}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Vista club
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-20 md:pb-0 md:p-6">
          <Outlet />
        </main>

        <nav
          data-testid="player-bottom-nav"
          className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur md:hidden"
        >
          <ul className={cn("mx-auto grid max-w-lg", colsClass)}>
            {visibleItems.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-0.5 py-1.5 text-[11px] transition-colors",
                      isActive
                        ? "font-medium text-foreground"
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
    </div>
  );
}
