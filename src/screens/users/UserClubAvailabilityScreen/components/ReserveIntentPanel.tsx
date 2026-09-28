import { Link, useLocation } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PublicClubSlot } from "@/modules/clubs";
import { formatArs } from "@/lib/money";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

interface ReserveIntentPanelProps {
  slot: PublicClubSlot | null;
  onClose: () => void;
}

export default function ReserveIntentPanel({ slot, onClose }: ReserveIntentPanelProps) {
  const { isAuthenticated } = useMockSession();
  const location = useLocation();
  const nextPath = `${location.pathname}${location.search}`;
  const nextQuery = `?next=${encodeURIComponent(nextPath)}`;

  if (isAuthenticated) {
    return (
      <section
        className="space-y-2 rounded-xl border border-border bg-card p-4"
        data-testid="public-reserve-intent"
      >
        <h3 className="text-base font-semibold tracking-tight">
          {slot ? `${slot.courtName} · ${slot.label}` : "Reservar un turno"}
        </h3>
        <p className="text-sm text-muted-foreground">
          Reservar desde la app todavía no está disponible. El club puede tomar el turno.
        </p>
      </section>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent data-testid="public-reserve-auth-dialog">
        <DialogHeader>
          <DialogTitle>Para reservar necesitás una cuenta</DialogTitle>
          <DialogDescription>
            Los turnos se pueden mirar sin ingresar. La cuenta es para pedir el turno.
          </DialogDescription>
        </DialogHeader>
        {slot ? (
          <p className="text-sm text-foreground">
            {slot.courtName} · {slot.label} · {formatArs(slot.price)}
            {slot.priceLabel ? ` (${slot.priceLabel})` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Elegí un turno libre de una cancha para reservarlo.
          </p>
        )}
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
          <li>El pedido queda a tu nombre.</li>
          <li>Te avisamos cuando el club lo confirme.</li>
        </ul>
        <DialogFooter>
          <Link
            to={`${ROUTES.auth.login}${nextQuery}`}
            className={cn(buttonVariants(), "h-9")}
          >
            Ingresar
          </Link>
          <Link
            to={`${ROUTES.auth.register}${nextQuery}`}
            className={cn(buttonVariants({ variant: "outline" }), "h-9")}
          >
            Crear cuenta
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
