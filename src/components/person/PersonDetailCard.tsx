import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";
import PhoneWhatsApp from "@/components/PhoneWhatsApp";
import { ROUTES } from "@/router/routes";

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
  /** Cuenta app; si hay, muestra “Ver perfil” al lado del nombre. */
  userId?: string | null;
  badges?: PersonDetailBadge[];
  fields: PersonDetailField[];
}

/** Avatar, nombre, pastillas y datos. La misma ficha del detalle de cliente. */
export default function PersonDetailCard({
  name,
  avatarUrl,
  userId = null,
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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h2>
              {userId ? (
                <Link
                  to={ROUTES.player.playerProfile(userId)}
                  className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary-strong hover:underline"
                  data-testid="person-detail-profile-link"
                >
                  Ver perfil
                  <ChevronRight className="size-4" />
                </Link>
              ) : null}
            </div>
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
                    {field.phone ? (
                      <PhoneWhatsApp
                        phone={field.phone}
                        className="text-sm font-medium leading-5 text-foreground"
                      />
                    ) : (
                      <p className="text-sm font-medium leading-5 text-foreground">{field.value}</p>
                    )}
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
