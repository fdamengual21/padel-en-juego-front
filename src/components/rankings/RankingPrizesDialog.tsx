import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ClubRankingPrize } from "@/modules/rankings";

interface RankingPrizesDialogProps {
  prizes: ClubRankingPrize[];
  triggerClassName?: string;
}

/** Botón que abre los premios del ranking por puesto. */
export default function RankingPrizesDialog({ prizes, triggerClassName }: RankingPrizesDialogProps) {
  const [open, setOpen] = useState(false);
  const items = prizes
    .filter((item) => item.label.trim())
    .slice()
    .sort((a, b) => a.place - b.place);
  if (items.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={triggerClassName}
        onClick={() => setOpen(true)}
        data-testid="ranking-prizes-button"
      >
        <Gift className="size-4" />
        Premios
      </Button>
      <DialogContent className="max-w-md" data-testid="ranking-prizes-dialog">
        <DialogHeader>
          <DialogTitle>Premios del ranking</DialogTitle>
          <DialogDescription>
            Van a quienes terminen en ese puesto de la tabla. Si hay empate, se reparte.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((prize) => (
            <li key={`${prize.place}-${prize.label}`} className="flex items-start gap-3 px-4 py-2.5 text-sm">
              <span className="w-8 shrink-0 font-semibold tabular-nums">{prize.place}º</span>
              <span className="min-w-0">{prize.label}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
