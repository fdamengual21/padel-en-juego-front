import { StatusChip, type StatusTone } from "@/components/StatusChip";

const chips: Record<string, { label: string; tone: StatusTone }> = {
  scheduled: { label: "Programado", tone: "scheduled" },
  live: { label: "En curso", tone: "active" },
  inProgress: { label: "En vivo", tone: "live" },
  finished: { label: "Finalizado", tone: "done" },
  walkover: { label: "Walkover", tone: "done" },
  cancelled: { label: "Cancelado", tone: "neutral" },
  booked: { label: "Reservada", tone: "success" },
  completed: { label: "Completada", tone: "done" },
  draft: { label: "Borrador", tone: "neutral" },
  upcoming: { label: "Próximamente", tone: "upcoming" },
  registrationOpen: { label: "Inscripciones abiertas", tone: "open" },
  draftTournament: { label: "Borrador", tone: "neutral" },
  DISQUALIFIED: { label: "Desclasificado", tone: "danger" },
  CONFIRMED: { label: "Aceptado", tone: "success" },
  ACCEPTED: { label: "Aceptado", tone: "success" },
  REJECTED: { label: "Rechazado", tone: "danger" },
  PENDING: { label: "Pendiente", tone: "warning" },
  WAITLIST: { label: "Lista de espera", tone: "neutral" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
  active: { label: "Activo", tone: "success" },
  withdrawn: { label: "Retirado", tone: "neutral" },
  disqualified: { label: "Desclasificado", tone: "danger" },
};

interface StatusBadgeProps {
  status: string;
  /** Pisa el texto por defecto del estado. */
  label?: string;
  className?: string;
}

export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const chip = chips[status];
  return (
    <StatusChip
      tone={chip?.tone ?? "neutral"}
      label={label ?? chip?.label ?? status}
      className={className}
    />
  );
}
