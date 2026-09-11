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
  CONFIRMED: "Confirmado",
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
  return (
    <Badge variant="secondary" className={cn("font-medium", className)}>
      {labels[status] ?? status}
    </Badge>
  );
}
