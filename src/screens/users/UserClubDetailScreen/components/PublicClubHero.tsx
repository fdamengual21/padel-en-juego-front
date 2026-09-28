import { useState } from "react";
import Avatar from "@/components/Avatar";
import type { PublicClubDetail } from "@/modules/clubs";

interface PublicClubHeroProps {
  club: PublicClubDetail;
}

export default function PublicClubHero({ club }: PublicClubHeroProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(club.coverUrl) && !coverFailed;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-muted"
      data-testid="public-club-hero"
    >
      <div className="relative min-h-44 sm:min-h-52">
        {showCover ? (
          <img
            src={club.coverUrl ?? ""}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30" />
        <div className="relative z-10 flex items-end gap-4 p-4 pt-16 sm:p-5 sm:pt-20">
          <Avatar
            name={club.name}
            imageUrl={club.avatarUrl}
            size="xl"
            alt={club.name}
            className="ring-2 ring-white/80"
          />
          <div className="min-w-0 pb-1 text-white">
            <p className="text-xs font-medium uppercase tracking-wide text-white/75">
              Club
            </p>
            <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {club.name}
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}
