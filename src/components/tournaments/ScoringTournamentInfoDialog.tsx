import type { ReactNode } from "react";
import { Info, LayoutGrid, Medal, Trophy, Users, XIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SCORING_MAX_PAIRS, SCORING_MIN_PAIRS } from "@/domain";

const rounds = [
  ["Campeón", "40"],
  ["Finalista", "22"],
  ["Semifinal", "14"],
  ["Cuartos", "8"],
  ["Octavos", "5"],
  ["Dieciseisavos", "3"],
  ["No salió de la zona", "0"],
] as const;

interface ScoringTournamentInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ScoringTournamentInfoDialog({
  open,
  onOpenChange,
}: ScoringTournamentInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(42rem,calc(100%-2rem))] max-w-lg gap-0 overflow-hidden p-0"
      >
        <div className="relative shrink-0 overflow-hidden bg-sidebar px-5 py-4 text-sidebar-foreground">
          <CourtMark />
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                className="absolute top-3 right-3 text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
          <div className="relative flex items-center gap-3 pr-8">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <PadelBallIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wider text-sidebar-foreground/70 uppercase">
                Reglas de juego
              </p>
              <DialogTitle className="text-lg leading-tight font-semibold text-sidebar-foreground">
                Torneo puntuable
              </DialogTitle>
              <p className="text-sm text-sidebar-foreground/70">
                Federación Internacional de Pádel (FIP)
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm text-foreground">
          <div className="flex gap-3 rounded-xl bg-muted px-3 py-3">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <DialogDescription className="text-sm leading-snug text-foreground">
              El puntaje y la configuración de partido siguen las normas de la FIP.
              El ranking es de la app.
            </DialogDescription>
          </div>

          <RuleRow icon={Trophy}>
            Con ventaja, al mejor de 3 sets a 6 juegos y tie-break a 7. Mínimo{" "}
            {SCORING_MIN_PAIRS} parejas y máximo {SCORING_MAX_PAIRS}. El tercer set
            es un set completo.
          </RuleRow>

          <RuleRow icon={Users}>
            Ese mínimo y ese máximo se controlan al inscribir: no se anota por
            encima del máximo. Con menos de {SCORING_MIN_PAIRS} parejas el torneo
            no suma.
          </RuleRow>

          <div>
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              <span className="inline-flex items-center gap-1.5">
                <Medal className="size-3.5 text-foreground" aria-hidden />
                Ronda en la que quedó
              </span>
              <span>Puntos</span>
            </div>
            <table className="w-full text-left">
              <caption className="sr-only">Puntos según la ronda en la que quedó</caption>
              <tbody>
                {rounds.map(([round, points]) => (
                  <tr key={round} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">{round}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="inline-flex min-w-8 justify-center rounded-full bg-primary/30 px-2 py-0.5 text-xs font-medium text-sidebar tabular-nums">
                        {points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-primary/10 px-3 py-3">
            <span className="mt-0.5 w-1 shrink-0 self-stretch rounded-full bg-primary" aria-hidden />
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <LayoutGrid className="size-4" aria-hidden />
            </span>
            <p className="leading-snug">
              Cada jugador cobra una sola cifra, la de la ronda final, cuando la
              categoría termina. No se suman los partidos del mismo torneo. Suman
              zonas + eliminación y eliminación directa.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RuleRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="leading-snug">{children}</p>
    </div>
  );
}

function PadelBallIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M8.4 5.8c1.5 2 1.5 10.4 0 12.4" />
      <path d="M15.6 5.8c-1.5 2-1.5 10.4 0 12.4" />
    </svg>
  );
}

function CourtMark() {
  return (
    <svg
      viewBox="0 0 180 140"
      className="pointer-events-none absolute top-0 right-0 h-full w-44 text-sidebar-foreground/20"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M36 16h128v108H36z" />
      <path d="M100 16v108" />
      <path d="M36 44h128" />
      <path d="M36 96h128" />
      <path d="M68 44v52" />
      <path d="M132 44v52" />
    </svg>
  );
}
