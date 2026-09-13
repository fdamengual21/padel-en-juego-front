import { formatCategoryLevel } from "@core-api";
import type { IdentityMatch } from "@core-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DuplicateIdentityDialogProps {
  open: boolean;
  matches: IdentityMatch[];
  onOpenChange: (open: boolean) => void;
  onUseMatch: (match: IdentityMatch) => void;
  onCreateNew: () => void;
}

export default function DuplicateIdentityDialog({
  open,
  matches,
  onOpenChange,
  onUseMatch,
  onCreateNew,
}: DuplicateIdentityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        data-testid="duplicate-identity-dialog"
      >
        <DialogHeader>
          <DialogTitle>Ya existe alguien con esos datos</DialogTitle>
          <DialogDescription>
            Encontramos coincidencias por email o teléfono. Podés usar una
            ficha existente o dar de alta una nueva.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {matches.map((match) => (
            <li key={`${match.kind}-${match.clientId}-${match.playerId}-${match.userId}`}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-left",
                  "hover:bg-muted/40 transition-colors",
                )}
                onClick={() => onUseMatch(match)}
              >
                <p className="text-sm font-medium text-foreground">
                  {match.displayName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {match.sourceLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {[
                    match.email,
                    match.phone,
                    match.age != null ? `${match.age} años` : null,
                    match.categoryLevel != null
                      ? formatCategoryLevel(
                          match.categoryLevel as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin contacto extra"}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" variant="secondary" onClick={onCreateNew}>
            Dar de alta nuevo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
