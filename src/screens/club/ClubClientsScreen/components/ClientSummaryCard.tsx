import type { ClubClientListItem } from "@/modules/clients";
import Avatar from "@/components/Avatar";
import { formatCategoryLevel, isCategoryLevel } from "@/domain";

interface ClientSummaryCardProps {
  client: ClubClientListItem;
  onOpen: (id: string) => void;
}

export default function ClientSummaryCard({ client, onOpen }: ClientSummaryCardProps) {
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
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{client.fullName}</p>
        <p className="truncate text-sm text-muted-foreground">
          {client.phone ?? "Sin teléfono"}
        </p>
        <p className="truncate text-xs text-muted-foreground">{category}</p>
      </div>
    </button>
  );
}
