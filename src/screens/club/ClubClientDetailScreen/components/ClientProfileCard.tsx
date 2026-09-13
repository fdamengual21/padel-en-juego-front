import type { CategoryLevel, Client } from "@core-api";
import { formatCategoryLevel } from "@core-api";
import Avatar from "@/components/Avatar";
import WhatsAppLink from "@/components/WhatsAppLink";
import { formatLocationEs } from "@/lib/dates";

interface ClientProfileCardProps {
  client: Client;
  categoryLevel: CategoryLevel | null;
  matchesWon: number;
  matchesLost: number;
  tournamentsCount: number;
}

export default function ClientProfileCard({
  client,
  categoryLevel,
  matchesWon,
  matchesLost,
  tournamentsCount,
}: ClientProfileCardProps) {
  const location = formatLocationEs(client.city, client.province);
  const avatarName =
    [client.firstName, client.lastName].filter(Boolean).join(" ").trim() ||
    client.displayName;

  const metaParts = [
    `Partidos ${matchesWon}–${matchesLost}`,
    `${tournamentsCount} torneo${tournamentsCount === 1 ? "" : "s"}`,
  ];

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      data-testid="client-profile-card"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <Avatar
          name={avatarName}
          imageUrl={client.avatarUrl}
          size="xl"
          alt={client.displayName}
          className="ring-2 ring-border"
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {client.displayName}
            </h2>
            <p className="text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
            {categoryLevel != null ? (
              <span className="inline-flex rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                Categoría {formatCategoryLevel(categoryLevel)}
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contacto
              </p>
              <div className="flex min-h-5 items-center gap-1.5">
                <p className="text-sm font-medium leading-5 text-foreground">
                  {client.phone || "Sin teléfono"}
                </p>
                <WhatsAppLink phone={client.phone} className="size-5" />
              </div>
              {client.email ? (
                <p className="text-sm text-muted-foreground">{client.email}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ubicación
              </p>
              <p className="flex min-h-5 items-center text-sm font-medium leading-5 text-foreground">
                {location || "Sin ubicación"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
