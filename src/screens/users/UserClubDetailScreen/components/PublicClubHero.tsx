import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Clock, Medal, MapPin } from "lucide-react";
import Avatar from "@/components/Avatar";
import PhoneWhatsApp from "@/components/PhoneWhatsApp";
import { StatusChip } from "@/components/StatusChip";
import { buttonVariants } from "@/components/ui/button";
import { isFeatureEnabled } from "@/config/features";
import { isCourtListedForPlayers } from "@/domain";
import { formatClubScheduleEs } from "@/lib/clubSchedule";
import { formatLocationEs } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { PublicClubDetail } from "@/modules/clubs";
import { ROUTES } from "@/router/routes";

interface PublicClubHeroProps {
  club: PublicClubDetail;
}

const chipClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-white/85";

const darkButtonClass =
  "h-10 border border-white/15 bg-white/10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

export default function PublicClubHero({ club }: PublicClubHeroProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(club.coverUrl) && !coverFailed;
  const locality = formatLocationEs(club.municipalityName, club.provinceName);
  const address = [club.street, club.streetNumber].filter(Boolean).join(" ");
  const place = [address, locality].filter(Boolean).join(", ");
  const schedule =
    club.openTime && club.closeTime
      ? formatClubScheduleEs(club.openTime, club.closeTime, club.openDays)
      : null;
  const mapsHref = mapsUrl(club);
  const instagram = instagramHref(club.instagramHandle);
  const courtCount = club.courts.filter((court) => isCourtListedForPlayers(court.status)).length;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-sidebar"
      data-testid="public-club-hero"
    >
      <div className="relative h-40 sm:h-56">
        {showCover ? (
          <img
            src={club.coverUrl ?? ""}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/50 to-transparent" />
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          {club.openTime && club.closeTime ? (
            <StatusChip
              tone={club.isOpenNow ? "open" : "neutral"}
              label={club.isOpenNow ? "Abierto ahora" : "Cerrado ahora"}
              data-testid="public-club-open-now"
            />
          ) : null}
        </div>
      </div>

      <div className="relative z-10 -mt-14 flex flex-col gap-5 px-4 pb-5 text-white sm:-mt-20 sm:px-5 md:flex-row md:items-end">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
          <Avatar
            name={club.name}
            imageUrl={club.avatarUrl}
            size="xl"
            alt={club.name}
            className="size-24 rounded-2xl text-2xl shadow-2xl ring-4 ring-sidebar sm:size-28"
          />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="min-w-0 max-w-full truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {club.name}
              </h2>
              {courtCount > 0 ? (
                <span className="inline-flex shrink-0 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {courtCount === 1 ? "1 cancha" : `${courtCount} canchas`}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col items-center gap-1.5 text-sm text-white/85 sm:items-start">
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>
                  {place || "Ubicación no informada"}
                  {mapsHref ? (
                    <>
                      {" "}
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        Cómo llegar
                      </a>
                    </>
                  ) : null}
                </span>
              </p>
              <p className="flex items-start gap-1.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{schedule ?? "Horario no informado"}</span>
              </p>
            </div>

            {club.phone || instagram ? (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5 sm:justify-start">
                {club.phone ? (
                  <span className={chipClass}>
                    <PhoneWhatsApp phone={club.phone} className="text-white" />
                  </span>
                ) : null}
                {instagram ? (
                  <a
                    href={instagram.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(chipClass, "hover:bg-white/15")}
                  >
                    <span aria-hidden className="font-semibold text-primary">
                      @
                    </span>
                    {instagram.handle}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 md:ml-auto md:flex md:w-auto md:justify-end">
          <Link
            to={ROUTES.player.clubAvailability(club.id)}
            className={cn(
              buttonVariants(),
              "h-10",
              !isFeatureEnabled("ranking") && "col-span-2",
            )}
            data-testid="public-club-availability-link"
          >
            <CalendarCheck aria-hidden />
            Ver disponibilidad
          </Link>
          {isFeatureEnabled("ranking") ? (
            <Link
              to={ROUTES.player.clubRanking(club.id)}
              className={cn(buttonVariants({ variant: "outline" }), darkButtonClass)}
              data-testid="public-club-ranking-link"
            >
              <Medal aria-hidden />
              Ranking
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function mapsUrl(club: PublicClubDetail): string | null {
  if (club.googleMapsUrl) return club.googleMapsUrl;
  if (club.latitude != null && club.longitude != null) {
    return `https://www.google.com/maps?q=${club.latitude},${club.longitude}`;
  }
  const query = [club.street, club.streetNumber, club.municipalityName, club.provinceName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function instagramHref(handle: string | null): { href: string; handle: string } | null {
  const clean = handle?.trim().replace(/^@/, "");
  if (!clean) return null;
  return {
    handle: clean,
    href: `https://instagram.com/${encodeURIComponent(clean)}`,
  };
}
