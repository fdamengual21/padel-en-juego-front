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
  },
  { to: ROUTES.club.clients, label: "Clientes", icon: Users, feature: "clients" },
  { to: ROUTES.club.courts, label: "Canchas", icon: MapPin, feature: "courts" },
  {
    to: ROUTES.club.settings,
    label: "Configuración",
    icon: Settings,
    feature: "clubSettings",
  },
];

export default function ClubShell() {
  const navigate = useNavigate();
  const { clubId } = useMockSession();
  const visibleItems = filterByFeature(items);
  const { data: club } = useQuery({
    queryKey: ["club", clubId],
    queryFn: () => Api.ClubService().getById(clubId),
  });
  const clubName = club?.name?.trim() || "Club";

  return (
    <div className="min-h-svh bg-background text-foreground flex">
      <aside
        data-testid="club-sidebar"
        className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
      >
        <div className="px-4 py-5 border-b border-sidebar-border">
          <p className="text-xs font-medium tracking-wide text-sidebar-foreground/55 uppercase">
            StartPadel
          </p>
          <h1
            className="mt-1 text-xl font-semibold tracking-tight leading-snug line-clamp-2 text-sidebar-foreground"
            title={clubName}
          >
            {clubName}
          </h1>
        </div>
        <nav className="p-3 space-y-1">
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-base transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
          <NavLink
            to={ROUTES.player.home}
            className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-base text-sidebar-primary hover:bg-sidebar-foreground/10"
          >
            Vista jugador
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2 px-3 text-sidebar-foreground/55 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            onClick={() => navigate(ROUTES.home)}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden border-b border-border px-4 py-3 flex items-center gap-3 overflow-x-auto bg-card">
          {visibleItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "text-sm whitespace-nowrap rounded-md px-2 py-1",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            className="ml-auto text-sm whitespace-nowrap text-muted-foreground"
            onClick={() => navigate(ROUTES.home)}
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
