import { Phone } from "lucide-react";
import type { ClubClientListItem } from "@/modules/clients";
import Avatar from "@/components/Avatar";
import { SexIcon } from "@/components/sexes";
import { formatCategoryLevel, isCategoryLevel } from "@/domain";

interface ClientSummaryCardProps {
  client: ClubClientListItem;
  sexCode?: string | null;
  sexLabel?: string | null;
  onOpen: (id: string) => void;
}

export default function ClientSummaryCard({
  client,
  sexCode,
  sexLabel,
  onOpen,
}: ClientSummaryCardProps) {
  const category = isCategoryLevel(client.categoryLevel)
    ? formatCategoryLevel(client.categoryLevel)
    : "Sin categoría";

  return (
    <button
      type="button"
      onClick={() => onOpen(client.id)}
      className="flex h-full w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30"
      data-testid={`client-card-${client.id}`}
    >
      <Avatar name={client.fullName} imageUrl={client.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-semibold text-foreground">
            {client.fullName}
          </p>
          <SexIcon code={sexCode} title={sexLabel ?? undefined} className="size-4" />
        </div>
        <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <Phone className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{client.phone ?? "Sin teléfono"}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">{category}</p>
      </div>
    </button>
  );
}
