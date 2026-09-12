import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  scheduled: "Programado",
  inProgress: "En vivo",
  finished: "Finalizado",
  walkover: "Walkover",
  cancelled: "Cancelado",
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

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const isLive = status === "inProgress";
  return (
    <Badge
      variant={isLive ? "default" : "secondary"}
      className={cn(
        "font-medium",
        isLive && "bg-primary text-primary-foreground",
        className,
      )}
    >
      {labels[status] ?? status}
    </Badge>
  );
}
