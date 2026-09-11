import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, LayoutDashboard, LogOut, MapPin, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

const items = [
  { to: ROUTES.club.dashboard, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: ROUTES.club.tournaments, label: "Torneos", icon: Trophy },
  { to: ROUTES.club.clients, label: "Clientes", icon: Users },
  { to: ROUTES.club.courts, label: "Canchas", icon: MapPin },
  { to: ROUTES.club.schedule, label: "Agenda", icon: CalendarDays },
];

export default function ClubShell() {
  const navigate = useNavigate();

  return (
    <div className="min-h-svh bg-background text-foreground flex">
      <aside
        data-testid="club-sidebar"
        className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex"
      >
        <div className="px-4 py-5 border-b border-sidebar-border">
          <p className="text-xs text-muted-foreground">StartPadel</p>
          <h1 className="text-lg font-semibold tracking-tight">Club</h1>
        </div>
        <nav className="p-3 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/60",
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-sidebar-border p-3">
          <NavLink
            to={ROUTES.player.home}
            className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-sidebar-accent/60"
          >
            Vista jugador
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2 px-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(ROUTES.home)}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden border-b border-border px-4 py-3 flex items-center gap-3 overflow-x-auto">
          {items.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn("text-sm whitespace-nowrap", isActive ? "text-primary font-medium" : "text-muted-foreground")
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
