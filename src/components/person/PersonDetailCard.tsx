import Avatar from "@/components/Avatar";
import WhatsAppLink from "@/components/WhatsAppLink";

export interface PersonDetailBadge {
  label: string;
  /** Texto suelto, sin pastilla. */
  plain?: boolean;
}

export interface PersonDetailField {
  label: string;
  value: string;
  /** Si es un teléfono usable, muestra el acceso a WhatsApp. */
  phone?: string | null;
}

interface PersonDetailCardProps {
  name: string;
  avatarUrl?: string | null;
  badges?: PersonDetailBadge[];
  fields: PersonDetailField[];
}

/** Avatar, nombre, pastillas y datos. La misma ficha del detalle de cliente. */
export default function PersonDetailCard({
  name,
  avatarUrl,
  badges = [],
  fields,
}: PersonDetailCardProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <Avatar
          name={name}
          imageUrl={avatarUrl}
          size="xl"
          alt={name}
          className="ring-2 ring-border"
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h2>
            {badges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) =>
                  badge.plain ? (
                    <p key={badge.label} className="text-sm text-muted-foreground">
                      {badge.label}
                    </p>
                  ) : (
                    <span
                      key={badge.label}
                      className="inline-flex rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {badge.label}
                    </span>
                  ),
                )}
              </div>
            ) : null}
          </div>
          {fields.length > 0 ? (
            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.label} className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </p>
                  <div className="flex min-h-5 items-center gap-1.5">
                    <p className="text-sm font-medium leading-5 text-foreground">{field.value}</p>
                    {field.phone ? <WhatsAppLink phone={field.phone} className="size-5" /> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
