import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";
import PhoneWhatsApp from "@/components/PhoneWhatsApp";
import { ROUTES } from "@/router/routes";

export interface RegistrationPlayerColumn {
  key: string;
  name: string;
  imageUrl: string | null;
  /** Cuenta app; sin cuenta no hay perfil público. */
  userId: string | null;
  category: string;
  side: string;
  phone: string | null;
}

interface RegistrationPlayerCardProps {
  player: RegistrationPlayerColumn;
}

export default function RegistrationPlayerCard({ player }: RegistrationPlayerCardProps) {
  const header = (
    <>
      <Avatar name={player.name} imageUrl={player.imageUrl} size="sm" alt={player.name} />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{player.name}</p>
    </>
  );
  const hasDetails = player.category !== "—" || player.side !== "—" || Boolean(player.phone);

  return (
    <section className="rounded-xl border border-border bg-card p-3">
      {player.userId ? (
        <Link
          to={ROUTES.player.playerProfile(player.userId)}
          className="-m-1.5 flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted"
          data-testid="registration-player-profile-link"
        >
          {header}
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary-strong">
            Ver perfil
            <ChevronRight className="size-3.5" />
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-2">{header}</div>
      )}
      {hasDetails ? (
        <dl className="mt-3 space-y-1.5 text-sm">
          {player.category !== "—" ? <Detail label="Categoría" value={player.category} /> : null}
          {player.side !== "—" ? <Detail label="Lado" value={player.side} /> : null}
          {player.phone ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd className="min-w-0 text-right">
                <PhoneWhatsApp phone={player.phone} />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
