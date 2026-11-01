import { Button } from "@/components/ui/button";

interface ListPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  /** Singular y plural del item, ej. `["jugador", "jugadores"]`. */
  itemLabel: [string, string];
  disabled?: boolean;
  onPageChange: (page: number) => void;
  testId?: string;
}

/** Resumen + Anterior / páginas / Siguiente. Sin botones si entra todo en una página. */
export default function ListPagination({
  page,
  totalPages,
  totalItems,
  itemLabel,
  disabled = false,
  onPageChange,
  testId,
}: ListPaginationProps) {
  if (totalItems === 0) return null;

  const [one, other] = itemLabel;
  const pages = visiblePages(page, totalPages);

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid={testId}
    >
      <p className="text-sm text-muted-foreground">
        {totalPages > 1 ? `Página ${page} de ${totalPages} · ` : null}
        {totalItems} {totalItems === 1 ? one : other}
      </p>
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          {pages.map((item, index) =>
            item === "…" ? (
              <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-muted-foreground">
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
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
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
