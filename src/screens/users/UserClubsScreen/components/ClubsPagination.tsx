import { Button } from "@/components/ui/button";

interface ClubsPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  loadedCount: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
}

export default function ClubsPagination({
  page,
  totalPages,
  totalItems,
  loadedCount,
  disabled = false,
  onPageChange,
  onLoadMore,
}: ClubsPaginationProps) {
  if (totalItems === 0) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const pages = visiblePages(page, totalPages);

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="public-clubs-pagination"
    >
      <p className="text-sm text-muted-foreground">
        {loadedCount} de {totalItems} club
        {totalItems === 1 ? "" : "es"}
      </p>
      <div className="hidden flex-wrap items-center gap-1 sm:flex">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        {pages.map((item, index) =>
          item === "…" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1.5 text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === page ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
      {canNext ? (
        <Button
          type="button"
          variant="outline"
          className="sm:hidden"
          disabled={disabled}
          onClick={onLoadMore}
          data-testid="public-clubs-load-more"
        >
          Cargar más
        </Button>
      ) : null}
    </div>
  );
}

function visiblePages(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (const n of sorted) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && n - prev > 1) out.push("…");
    out.push(n);
  }
  return out;
}
