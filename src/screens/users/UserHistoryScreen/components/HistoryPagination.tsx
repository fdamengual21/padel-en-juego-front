import { Button } from "@/components/ui/button";

interface HistoryPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export default function HistoryPagination({
  page,
  totalPages,
  totalItems,
  disabled = false,
  onPageChange,
}: HistoryPaginationProps) {
  if (totalItems <= 0) return null;

  const pages = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), pages);

  return (
    <div
      className="flex items-center justify-between gap-3"
      data-testid="player-history-pagination"
    >
      <Button
        type="button"
        variant="outline"
        disabled={disabled || current <= 1}
        onClick={() => onPageChange(current - 1)}
      >
        Anterior
      </Button>
      <p className="text-sm text-muted-foreground">
        {current} de {pages}
        <span className="mx-1">·</span>
        {totalItems} torneo{totalItems === 1 ? "" : "s"}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || current >= pages}
        onClick={() => onPageChange(current + 1)}
      >
        Siguiente
      </Button>
    </div>
  );
}
