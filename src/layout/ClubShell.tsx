import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  MapPin,
  Medal,
  Menu,
  Repeat,
  Settings,
  Trophy,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMockSession } from "@/app/MockSessionProvider";
import { usePermissions } from "@/authorization";
import AppLogo from "@/components/AppLogo";
import {
  PERMISSION_CLUB_COURTS_READ,
  PERMISSION_CLUB_CLIENTS_READ,
  PERMISSION_CLUB_RESERVATIONS_READ,
  PERMISSION_CLUB_SCHEDULE_READ,
  PERMISSION_CLUB_SETTINGS_READ,
  PERMISSION_CLUB_TOURNAMENTS_READ,
  PERMISSION_CLUB_USERS_READ,
} from "@/authorization/permissionCodes";
import AccountDrawerMenu, {
  AccountActionSections,
} from "@/layout/AccountDrawerMenu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
  permissions?: readonly string[];
  permissionMode?: "all" | "any";
}

const items: NavItem[] = [
  {
    to: ROUTES.club.dashboard,
    label: "Inicio",
    icon: LayoutDashboard,
    end: true,
    feature: "clubDashboard",
    permission: PERMISSION_CLUB_RESERVATIONS_READ,
  },
  {
    to: ROUTES.club.tournaments,
    label: "Torneos",
    icon: Trophy,
    feature: "tournaments",
    permission: PERMISSION_CLUB_TOURNAMENTS_READ,
  },
  {
    to: ROUTES.club.ranking,
    label: "Ranking",
    icon: Medal,
    feature: "ranking",
    permission: PERMISSION_CLUB_TOURNAMENTS_READ,
  },
  { to: ROUTES.club.clients, label: "Clientes", icon: Users, feature: "clients", permission: PERMISSION_CLUB_CLIENTS_READ },
  {
    to: ROUTES.club.staff,
    label: "Usuarios",
    icon: UserCog,
    permission: PERMISSION_CLUB_USERS_READ,
  },
  {
    to: ROUTES.club.courts,
    label: "Canchas",
    icon: MapPin,
    feature: "courts",
    permissions: [PERMISSION_CLUB_COURTS_READ, PERMISSION_CLUB_SCHEDULE_READ],
    permissionMode: "any",
  },
  {
    to: ROUTES.club.fixedReservations,
    label: "Fijos",
    icon: Repeat,
    feature: "courts",
    permission: PERMISSION_CLUB_RESERVATIONS_READ,
  },
  {
    to: ROUTES.club.settings,
    label: "Configuración",
    icon: Settings,
    feature: "clubSettings",
    permission: PERMISSION_CLUB_SETTINGS_READ,
  },
];

/** Routes that live in the mobile "Más" sheet instead of the bottom bar. */
const MORE_NAV_ROUTES = new Set<string>([
  ROUTES.club.staff,
  ROUTES.club.fixedReservations,
  ROUTES.club.settings,
]);

const gridColsClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
};

export default function ClubShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { clubs, selectedClubId, player, logout, exitClubMode } =
    useMockSession();
  const { can } = usePermissions();
  const { session, error } = useLoadClubSession();
  const visibleItems = filterByFeature(items).filter((item) => {
    if (item.permissions && item.permissions.length > 0) {
      return can(item.permissions, { mode: item.permissionMode ?? "all" });
    }
    return !item.permission || can(item.permission);
  });
  const moreNavItems = visibleItems.filter((item) =>
    MORE_NAV_ROUTES.has(item.to),
  );
  const bottomItems = visibleItems.filter(
    (item) => !MORE_NAV_ROUTES.has(item.to),
  );
  const bottomCount = bottomItems.length + 1;
  const colsClass = gridColsClass[bottomCount] ?? "grid-cols-5";
  const moreActive =
    moreOpen ||
    moreNavItems.some(
      (item) =>
        pathname === item.to || pathname.startsWith(`${item.to}/`),
    );
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
  const greeting = player?.firstName?.trim()
    ? `¡Hola, ${player.firstName.trim()}!`
    : "¡Hola!";
  const accountActions = (placement: "sidebar" | "sheet") => [
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
        <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-5">
          <AppLogo className="size-10" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-sidebar-foreground/55">
              Start <span className="text-sidebar-primary">Point</span>
            </p>
            <h1
              className="mt-0.5 line-clamp-2 text-xl font-semibold leading-snug tracking-tight text-sidebar-foreground"
              title={clubName}
            >
              {clubName}
            </h1>
          </div>
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
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <AppLogo className="size-9" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Start <span className="text-primary-strong">Point</span>
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {clubName}
            </h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
        <nav
          data-testid="club-bottom-nav"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden"
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
          <SheetContent
            side="bottom"
            className="rounded-t-2xl border-sidebar-border bg-sidebar text-sidebar-foreground [&_[data-slot=sheet-close]]:text-sidebar-foreground [&_[data-slot=sheet-close]]:hover:bg-sidebar-foreground/10 [&_[data-slot=sheet-close]]:hover:text-sidebar-foreground"
          >
            <SheetHeader>
              <SheetTitle className="text-sidebar-foreground">Más</SheetTitle>
              <SheetDescription className="text-sidebar-foreground/55">
                {greeting}
              </SheetDescription>
            </SheetHeader>
            <div className="px-3 pb-6">
              {moreNavItems.length > 0 ? (
                <div className="mb-1">
                  {moreNavItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-sidebar-foreground/10",
                          isActive &&
                            "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                        )
                      }
                      onClick={() => setMoreOpen(false)}
                    >
                      <Icon className="size-4 text-sidebar-foreground/55" />
                      {label}
                    </NavLink>
                  ))}
                  <div className="my-1 h-px bg-sidebar-foreground/15" />
                </div>
              ) : null}
              <AccountActionSections
                onClub
                actions={accountActions("sheet")}
                renderItem={(action) => (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-sidebar-foreground/10"
                    data-testid={action.testId}
                    onClick={() => {
                      setMoreOpen(false);
                      action.onSelect();
                    }}
                  >
                    <action.icon className="size-4 text-sidebar-foreground/55" />
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
