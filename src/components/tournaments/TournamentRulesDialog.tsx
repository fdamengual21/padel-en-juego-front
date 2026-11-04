import { useState } from "react";
import { BookOpen } from "lucide-react";
import type { DrawRules, MatchRules, TournamentFormat } from "@/domain";
import { asDrawRules, tournamentFormatLabel, tournamentRulesSections } from "@/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TournamentRulesDialogProps {
  format: TournamentFormat;
  matchRules: MatchRules;
  drawRules?: DrawRules | string | null;
  categoryName?: string | null;
}

/** Botón con tooltip que abre el reglamento general de la categoría: puntos, desempates y cruces. */
export default function TournamentRulesDialog({
  format,
  matchRules,
  drawRules,
  categoryName,
}: TournamentRulesDialogProps) {
  const [open, setOpen] = useState(false);
  const rulesCode = asDrawRules(drawRules);
  const sections = tournamentRulesSections(format, matchRules, rulesCode);
  const aligned =
    rulesCode === "FAP"
      ? "Criterios alineados al reglamento FAP para zonas y clasificación."
      : "Criterios alineados al reglamento FIP para torneos por puntos.";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delay={200}>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Ver reglamento"
              data-testid="tournament-rules-button"
              onClick={() => setOpen(true)}
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Reglamento</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Sistema de puntos, desempates y cómo se arman los cruces en este torneo.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="max-w-lg" data-testid="tournament-rules-dialog">
        <DialogHeader>
          <DialogTitle>Reglamento · {tournamentFormatLabel(format)}</DialogTitle>
          <DialogDescription>
            {categoryName ? `${categoryName}. ` : ""}
            {aligned}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="space-y-1.5">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
