import type { PlayerCategoryHistoryEntry } from "@core-api";
import { formatCategoryLevel } from "@core-api";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { CATEGORY_CHANGE_REASON_LABEL } from "../categoryLabels";

dayjs.locale("es");

interface CategoryHistoryListProps {
  entries: PlayerCategoryHistoryEntry[];
}

function formatHistoryDate(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return iso;
  return d.format("D MMM YYYY");
}

export default function CategoryHistoryList({ entries }: CategoryHistoryListProps) {
  const ordered = [...entries].reverse();

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin historial de categoría.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {ordered.map((entry) => (
        <li
          key={entry.id}
          className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {entry.previousLevel != null
                ? `${formatCategoryLevel(entry.previousLevel)} → ${formatCategoryLevel(entry.level)}`
                : formatCategoryLevel(entry.level)}
            </p>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_CHANGE_REASON_LABEL[entry.reason]}
            </p>
          </div>
          <time
            dateTime={entry.at}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatHistoryDate(entry.at)}
          </time>
        </li>
      ))}
    </ul>
  );
}
