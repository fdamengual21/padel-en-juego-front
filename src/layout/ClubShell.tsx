import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Settings,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMockSession } from "@/app/MockSessionProvider";
import { usePermissions } from "@/authorization";
import {
  PERMISSION_CLUB_COURTS_READ,
  PERMISSION_CLUB_SETTINGS_READ,
  PERMISSION_CLUB_TOURNAMENTS_READ,
} from "@/authorization/permissionCodes";
import AccountDrawerMenu, {
  AccountActionSections,
} from "@/layout/AccountDrawerMenu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { filterByFeature, type FeatureKey } from "@/config/features";
import { useLoadClubSession } from "@/hooks/useClubSession";
import { toastError } from "@/lib/toast";
import { findUserClub } from "@/modules/auth/clubContext";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  feature?: FeatureKey;
  permission?: string;
}

const items: NavItem[] = [
  {
    to: ROUTES.club.dashboard,
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
    feature: "clubDashboard",
  },
  {
    to: ROUTES.club.tournaments,
    label: "Torneos",
    icon: Trophy,
    feature: "tournaments",
    permission: PERMISSION_CLUB_TOURNAMENTS_READ,
  },
  { to: ROUTES.club.clients, label: "Clientes", icon: Users, feature: "clients" },
  {
    to: ROUTES.club.courts,
    label: "Canchas",
    icon: MapPin,
    feature: "courts",
    permission: PERMISSION_CLUB_COURTS_READ,
  },
  {
    to: ROUTES.club.settings,
    label: "Configuración",
    icon: Settings,
    feature: "clubSettings",
    permission: PERMISSION_CLUB_SETTINGS_READ,
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

export default function ClubShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { clubs, selectedClubId, player, logout, exitClubMode } =
    useMockSession();
  const { can } = usePermissions();
  const { session, error } = useLoadClubSession();
  const visibleItems = filterByFeature(items).filter(
    (item) => !item.permission || can(item.permission),
  );
  const bottomItems = visibleItems.filter(
    (item) => item.to !== ROUTES.club.settings,
  );
  const showSettings = visibleItems.some(
    (item) => item.to === ROUTES.club.settings,
  );
  const bottomCount = bottomItems.length + 1;
  const colsClass = gridColsClass[bottomCount] ?? "grid-cols-5";
  const moreActive = moreOpen || pathname === ROUTES.club.settings;
  const membership = findUserClub(clubs, selectedClubId);

  useEffect(() => {
    const status = error?.status;
    if (status !== 403 && status !== 400) return;
    toastError("No tenés acceso a este club");
    useAuthStore.getState().clearSelectedClub();
    navigate(ROUTES.chooseMode, { replace: true });
  }, [error, navigate]);

  const clubName =
    session?.name?.trim() || membership?.name?.trim() || "Club";

  const goToPlayer = () => {
    exitClubMode();
    navigate(ROUTES.home);
  };

  const goToClubPicker = () => {
    exitClubMode();
    navigate(ROUTES.chooseMode);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.home);
  };

  const displayName = player?.displayName ?? "Jugador";
  const accountActions = (placement: "sidebar" | "sheet") => [
    ...(placement === "sheet" && showSettings
      ? [
          {
            label: "Configuración",
            icon: Settings,
            group: "account" as const,
            onSelect: () => navigate(ROUTES.club.settings),
          },
        ]
      : []),
    {
      label: "Ir a vista jugador",
      icon: User,
      group: "context" as const,
      onSelect: goToPlayer,
    },
    ...(clubs.length > 1
      ? [
          {
            label: "Cambiar club",
            icon: ArrowLeftRight,
            group: "context" as const,
            onSelect: goToClubPicker,
          },
        ]
      : []),
    {
      label: "Cerrar sesión",
      icon: LogOut,
      group: "session" as const,
      onSelect: handleLogout,
      testId: placement === "sidebar" ? "club-logout" : undefined,
    },
  ];

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside
        data-testid="club-sidebar"
        className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
      >
        <div className="border-b border-sidebar-border px-4 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/55">
            Easy padel
          </p>
          <h1
            className="mt-1 line-clamp-2 text-xl font-semibold leading-snug tracking-tight text-sidebar-foreground"
            title={clubName}
          >
            {clubName}
          </h1>
        </div>
        <nav className="space-y-1 p-3">
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-base transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground",
                )
              }
            >
              <Icon className="size-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-sidebar-border p-3">
          <AccountDrawerMenu
            displayName={displayName}
            avatarUrl={player?.avatarUrl}
            surface="club"
            placement="sidebar"
            actions={accountActions("sidebar")}
            testId="club-account-menu"
          />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card px-4 py-3 md:hidden">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Easy padel
          </p>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {clubName}
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
        <nav
          data-testid="club-bottom-nav"
          className="fixed inset-x-0 bottom-0 border-t border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden"
        >
          <ul className={cn("mx-auto grid max-w-lg", colsClass)}>
            {bottomItems.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-0.5 py-1.5 text-[11px] transition-colors",
                      isActive
                        ? "font-medium text-sidebar-foreground"
                        : "text-sidebar-foreground/70",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground",
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
            <li>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-center gap-0.5 py-1.5 text-[11px] transition-colors",
                  moreActive
                    ? "font-medium text-sidebar-foreground"
                    : "text-sidebar-foreground/70",
                )}
                aria-expanded={moreOpen}
                data-testid="club-more"
                onClick={() => setMoreOpen(true)}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg",
                    moreActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                >
                  <Menu className="size-5" />
                </span>
                Más
              </button>
            </li>
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
