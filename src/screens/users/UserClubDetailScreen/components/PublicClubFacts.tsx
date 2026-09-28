import { Clock, MapPin, Phone } from "lucide-react";
import type { PublicClubDetail } from "@/modules/clubs";
import { formatClubScheduleEs } from "@/lib/clubSchedule";
import { formatLocationEs } from "@/lib/dates";

interface PublicClubFactsProps {
  club: PublicClubDetail;
}

export default function PublicClubFacts({ club }: PublicClubFactsProps) {
  const locality = formatLocationEs(club.municipalityName, club.provinceName);
  const address = [club.street, club.streetNumber].filter(Boolean).join(" ");
  const place = [address, locality].filter(Boolean).join(", ");
  const schedule =
    club.openTime && club.closeTime
      ? formatClubScheduleEs(club.openTime, club.closeTime, club.openDays)
      : null;
  const mapsHref = mapsUrl(club);
  const instagram = instagramHref(club.instagramHandle);

  return (
    <section className="grid gap-3 text-sm sm:grid-cols-2" data-testid="public-club-facts">
      <p className="flex items-start gap-2 text-muted-foreground">
        <MapPin className="mt-0.5 size-4 shrink-0" />
        <span>
          {place || "Ubicación no informada"}
          {mapsHref ? (
            <>
              {" "}
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary-strong underline-offset-4 hover:underline"
              >
                Cómo llegar
              </a>
            </>
          ) : null}
        </span>
      </p>
      <p className="flex items-start gap-2 text-muted-foreground">
        <Clock className="mt-0.5 size-4 shrink-0" />
        <span>{schedule ?? "Horario no informado"}</span>
      </p>
      {club.phone ? (
        <p className="flex items-center gap-2">
          <Phone className="size-4 shrink-0 text-muted-foreground" />
          <a
            href={`tel:${club.phone}`}
            className="font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            {club.phone}
          </a>
        </p>
      ) : null}
      {instagram ? (
        <p className="flex items-center gap-2">
          <span aria-hidden className="w-4 shrink-0 text-center text-muted-foreground">
            @
          </span>
          <a
            href={instagram.href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            {instagram.handle}
          </a>
        </p>
      ) : null}
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
