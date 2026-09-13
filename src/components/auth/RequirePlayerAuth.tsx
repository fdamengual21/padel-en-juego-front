import { Link } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

interface RequirePlayerAuthProps {
  /** Ruta a la que volver tras login/registro. */
  nextPath: string;
  children: React.ReactNode;
  /** Texto del CTA principal. */
  actionLabel?: string;
  className?: string;
}

/**
 * Si no hay sesión de jugador, muestra CTA Ingresar / Crear cuenta
 * en lugar del contenido protegido (inscribirse, reservar, etc.).
 */
export default function RequirePlayerAuth({
  nextPath,
  children,
  actionLabel = "Continuar",
  className,
}: RequirePlayerAuthProps) {
  const { isAuthenticated } = useMockSession();
  if (isAuthenticated) return <>{children}</>;

  const q = `?next=${encodeURIComponent(nextPath)}`;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 space-y-3",
        className,
      )}
      data-testid="auth-required-gate"
    >
      <p className="text-sm text-muted-foreground">
        Para {actionLabel.toLowerCase()} necesitás una cuenta. Podés mirar
        torneos y clubes sin ingresar.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          to={`${ROUTES.auth.login}${q}`}
          className={cn(buttonVariants(), "h-9")}
        >
          Ingresar
        </Link>
        <Link
          to={`${ROUTES.auth.register}${q}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-9")}
        >
          Crear cuenta
        </Link>
      </div>
      <Link
        to={ROUTES.player.home}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Seguir explorando
      </Link>
    </div>
  );
}
