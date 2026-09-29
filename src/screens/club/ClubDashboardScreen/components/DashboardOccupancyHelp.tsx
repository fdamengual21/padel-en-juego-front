import { Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import DashboardIconWell from "@/screens/club/components/DashboardIconWell";

interface DashboardOccupancyHelpProps {
  onMore: () => void;
}

export default function DashboardOccupancyHelp({ onMore }: DashboardOccupancyHelpProps) {
  return (
    <section className="rounded-xl border border-border bg-accent p-4 xl:min-h-[11.65rem]">
      <div className="flex items-start gap-3">
        <DashboardIconWell icon={Lightbulb} tone="accent" />
        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-semibold">¿Cómo se calcula la ocupación?</h3>
          <p className="text-sm text-muted-foreground">
            La ocupación tiene en cuenta los turnos aceptados, completados y los fijos vigentes sobre el horario del mes. La mañana y la siesta vacías bajan el número, y es esperable.
          </p>
          <button
            type="button"
            className="text-sm font-medium text-primary-strong"
            onClick={onMore}
          >
            Ver más información
          </button>
        </div>
      </div>
    </section>
  );
}

interface OccupancyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OccupancyDetailDialog({ open, onOpenChange }: OccupancyDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ocupación</DialogTitle>
          <DialogDescription>
            Turnos aceptados o completados, y los fijos vigentes, sobre todos los que genera el horario del mes, de la apertura al cierre. La mañana y la siesta vacías bajan el número y es esperable. No se compara con la punta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm font-medium">Punta de hoy</p>
          <p className="text-sm text-muted-foreground">
            Mañana es de 08:00 a 14:00 y tarde de 14:00 a 18:00. Esas dos se muestran sin alarma. La punta es desde las 18:00 e incluye el turno de las 22:00, confirmado o ya en juego. El de las 00:00 no entra.
          </p>
          <ul className="space-y-1.5 text-sm">
            <Legend dot="bg-destructive" label="Menos de 55 % Baja" />
            <Legend dot="bg-warning" label="55–74 % Regular" />
            <Legend dot="bg-success" label="75–89 % Buena" />
            <Legend dot="bg-primary-strong" label="90 % o más Casi llena" />
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden />
      <span>{label}</span>
    </li>
  );
}
