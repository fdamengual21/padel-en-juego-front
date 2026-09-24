import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  History,
  Home,
  LogOut,
  Medal,
  Menu,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { useMockSession } from "@/app/MockSessionProvider";
import Avatar from "@/components/Avatar";
import AccountDrawerMenu, {
  AccountActionSections,
  type AccountDrawerAction,
} from "@/layout/AccountDrawerMenu";
import { filterByFeature, isFeatureEnabled, type FeatureKey } from "@/config/features";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  { to: ROUTES.player.clubs, label: "Clubes", icon: Building2, feature: "clubs" },
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
    authOnly: true,
  },
];

const gridColsClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export default function UserShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const {
    isAuthenticated,
    player,
    logout,
    hasAssociatedClub,
    clubs,
    enterClub,
  } = useMockSession();
  const visibleItems = filterByFeature(items).filter(
    (item) => !item.authOnly || isAuthenticated,
  );
  const browseItems = visibleItems.filter(
    (item) => item.to !== ROUTES.player.profile,
  );
  const bottomCount = browseItems.length + (isAuthenticated ? 1 : 0);
  const colsClass = gridColsClass[bottomCount] ?? "grid-cols-5";
  const moreActive = moreOpen || pathname === ROUTES.player.profile;
  const displayName = isAuthenticated
    ? player?.displayName ?? "Jugador"
    : "Explorar";

  const goToClub = () => {
    if (clubs.length === 1 && clubs[0]) {
      enterClub(clubs[0].id);
      navigate(ROUTES.club.dashboard);
      return;
    }
    navigate(ROUTES.chooseMode);
  };

  const accountActions = (placement: "sidebar" | "sheet"): AccountDrawerAction[] => [
    ...(isFeatureEnabled("profile")
      ? [
          {
            label: "Mi perfil",
            icon: User,
            group: "account" as const,
            onSelect: () => navigate(ROUTES.player.profile),
          },
        ]
      : []),
    ...(hasAssociatedClub
      ? [
          {
            label: "Ir a vista club",
            icon: Building2,
            group: "context" as const,
            onSelect: goToClub,
          },
        ]
      : []),
    {
      label: "Cerrar sesión",
      icon: LogOut,
      group: "session",
      onSelect: logout,
      testId: placement === "sidebar" ? "player-logout" : undefined,
    },
  ];

  return (
    <div className="min-h-svh bg-background text-foreground flex">
      {/* Sidebar jugador: light, distinto del navy del club */}
      <aside
        data-testid="player-sidebar"
        className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r border-border bg-card text-foreground md:flex"
      >
        <div className="border-b border-border px-4 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Easy padel
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Jugador</h1>
        </div>
        <nav className="space-y-1 p-3">
          {browseItems.map(({ to, label, icon: Icon, end }) => (
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
          {isAuthenticated ? (
            <AccountDrawerMenu
              displayName={displayName}
              avatarUrl={player?.avatarUrl}
              surface="player"
              placement="sidebar"
              actions={accountActions("sidebar")}
              testId="player-account-menu"
            />
          ) : (
            <>
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                <Avatar name={displayName} size="sm" alt={displayName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">Sin sesión</p>
                </div>
              </div>
              <Link
                to={ROUTES.auth.login}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                data-testid="player-header-login"
              >
                Ingresar
              </Link>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Easy padel
          </p>
          {isAuthenticated ? null : (
            <Link
              to={ROUTES.auth.login}
              className="shrink-0 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Ingresar
            </Link>
          )}
        </header>

        <main className="flex-1 overflow-auto pb-20 md:pb-0 md:p-6">
          <Outlet />
        </main>

        <nav
          data-testid="player-bottom-nav"
          className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur md:hidden"
        >
          <ul className={cn("mx-auto grid max-w-lg", colsClass)}>
            {browseItems.map(({ to, label, icon: Icon, end }) => (
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
            {isAuthenticated ? (
              <li>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-center gap-0.5 py-1.5 text-[11px] transition-colors",
                    moreActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                  aria-expanded={moreOpen}
                  data-testid="player-more"
                  onClick={() => setMoreOpen(true)}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg",
                      moreActive && "bg-primary text-primary-foreground",
                    )}
                  >
                    <Menu className="size-5" />
                  </span>
                  Más
                </button>
              </li>
            ) : null}
          </ul>
        </nav>
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Más</SheetTitle>
            </SheetHeader>
            <div className="px-3 pb-6">
              <AccountActionSections
                actions={accountActions("sheet")}
                renderItem={(action) => (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-muted"
                    data-testid={action.testId}
                    onClick={() => {
                      setMoreOpen(false);
                      action.onSelect();
                    }}
                  >
                    <action.icon className="size-4 text-muted-foreground" />
                    {action.label}
                  </button>
                )}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
