import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { usePermissions } from "@/authorization";
import {
  PERMISSION_CLUB_COURTS_READ,
  PERMISSION_CLUB_SETTINGS_READ,
  PERMISSION_CLUB_TOURNAMENTS_READ,
} from "@/authorization/permissionCodes";
import { Button } from "@/components/ui/button";
import { filterByFeature, type FeatureKey } from "@/config/features";
import { ApiHttpError } from "@/lib/apiClient";
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

export default function ClubShell() {
  const navigate = useNavigate();
  const { clubId, clubs, selectedClubId, logout, exitClubMode } =
    useMockSession();
  const { can } = usePermissions();
  const canReadSettings = can(PERMISSION_CLUB_SETTINGS_READ);
  const visibleItems = filterByFeature(items).filter(
    (item) => !item.permission || can(item.permission),
  );
  const membership = findUserClub(clubs, selectedClubId);
  const settingsQuery = useQuery({
    queryKey: ["club-settings", clubId],
    queryFn: () => Api.ClubService().getSettings(),
    enabled: Boolean(clubId) && canReadSettings,
    retry: false,
  });

  useEffect(() => {
    const err = settingsQuery.error;
    if (!(err instanceof ApiHttpError)) return;
    if (err.status !== 403 && err.status !== 400) return;
    toastError("No tenés acceso a este club");
    useAuthStore.getState().clearSelectedClub();
    navigate(ROUTES.chooseMode, { replace: true });
  }, [navigate, settingsQuery.error]);

  const clubName =
    settingsQuery.data?.name?.trim() || membership?.name?.trim() || "Club";

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

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside
        data-testid="club-sidebar"
        className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
      >
        <div className="border-b border-sidebar-border px-4 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/55">
            Padel en juego
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
          {clubs.length > 1 ? (
            <button
              type="button"
              className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
              onClick={goToClubPicker}
            >
              Cambiar club
            </button>
          ) : null}
          <button
            type="button"
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base text-sidebar-primary hover:bg-sidebar-foreground/10"
            onClick={goToPlayer}
          >
            Vista jugador
          </button>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2 px-3 text-sidebar-foreground/55 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 overflow-x-auto border-b border-border bg-card px-4 py-3 md:hidden">
          {visibleItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-md px-2 py-1 text-sm",
                  isActive
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            className="whitespace-nowrap text-sm text-muted-foreground"
            onClick={goToPlayer}
          >
            Jugador
          </button>
          <button
            type="button"
            className="ml-auto whitespace-nowrap text-sm text-muted-foreground"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
