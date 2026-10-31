import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  scheduled: "Programado",
  inProgress: "En vivo",
  finished: "Finalizado",
  walkover: "Walkover",
  cancelled: "Cancelado",
  booked: "Reservada",
  completed: "Completada",
  draft: "Borrador",
  registrationOpen: "Inscripciones abiertas",
  draftTournament: "Borrador",
  DISQUALIFIED: "Desclasificado",
  CONFIRMED: "Aceptado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  PENDING: "Pendiente",
  WAITLIST: "Lista de espera",
  CANCELLED: "Cancelado",
  active: "Activo",
  withdrawn: "Retirado",
  disqualified: "Desclasificado",
};

const successTone = "border-transparent! bg-success-muted! text-success-foreground";
const warningTone = "border-transparent! bg-warning-muted! text-warning-foreground";
const dangerTone = "border-transparent! bg-destructive-muted! text-destructive";
const mutedTone = "border-transparent! bg-muted! text-muted-foreground";

const tones: Record<string, string> = {
  ACCEPTED: successTone,
  CONFIRMED: successTone,
  PENDING: warningTone,
  WAITLIST: mutedTone,
  REJECTED: dangerTone,
  DISQUALIFIED: dangerTone,
  disqualified: dangerTone,
  CANCELLED: mutedTone,
  cancelled: mutedTone,
  withdrawn: mutedTone,
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const isLive = status === "inProgress";
  const isOpen = status === "registrationOpen";

  return (
    <Badge
      variant={isLive ? "destructive" : isOpen ? "default" : "secondary"}
      className={cn(
        "font-medium",
        isOpen && "bg-primary text-primary-foreground",
        tones[status],
        className,
      )}
    >
      {isLive ? (
        <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" aria-hidden />
      ) : null}
      {labels[status] ?? status}
    </Badge>
  );
}
