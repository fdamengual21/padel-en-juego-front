import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RANKING_EVENT_MIN_PAIRS } from "@/modules/tournaments/flows";

const POINTS = [
  ["Campeón", 100],
  ["Final", 80],
  ["Semifinal", 60],
  ["Cuartos", 40],
  ["Octavos", 30],
  ["Zona (si jugó)", 10],
] as const;

interface RankingRulesDialogProps {
  categoryName: string;
  triggerClassName?: string;
}

/** Reglamento del ranking: formato de cada fecha, calendario de inscripción y puntos. */
export default function RankingRulesDialog({ categoryName, triggerClassName }: RankingRulesDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={triggerClassName}
        onClick={() => setOpen(true)}
        data-testid="ranking-rules-button"
      >
        <BookOpen className="size-4" />
        Reglamento
      </Button>
      <DialogContent className="max-w-lg" data-testid="ranking-rules-dialog">
        <DialogHeader>
          <DialogTitle>Reglamento del ranking</DialogTitle>
          <DialogDescription>{categoryName}. Una fecha Quality por semana.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">Cada fecha</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Formato Quality: zonas y después eliminación.</li>
              <li>Se juega en un solo día.</li>
              <li>Hacen falta {RANKING_EVENT_MIN_PAIRS} parejas aceptadas para comenzar.</li>
            </ul>
          </section>
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">Inscripción</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>La fecha se ve 7 días antes.</li>
              <li>La inscripción abre 2 días antes, a las 00:00.</li>
              <li>Te anotás en cada fecha por separado.</li>
            </ul>
          </section>
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">Puntos por jugador</h3>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {POINTS.map(([round, points]) => (
                <li key={round} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{round}</span>
                  <span className="font-semibold tabular-nums">{points} pts</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Se suman los puntos de todas las fechas finalizadas. Una fecha cancelada no suma.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
