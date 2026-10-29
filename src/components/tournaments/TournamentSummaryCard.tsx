import { useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  MapPin,
  Repeat2,
  Tag,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import ImageViewerDialog from "@/components/ImageViewerDialog";

export type TournamentSummaryStatKind =
  | "category"
  | "dates"
  | "pairs"
  | "fee"
  | "circuit"
  | "zones"
  | "matches";

export interface TournamentSummaryStat {
  kind: TournamentSummaryStatKind;
  label: string;
  value: string;
  detail?: string | null;
}

interface TournamentSummaryCardProps {
  bannerUrl?: string | null;
  fallbackName: string;
  stats: TournamentSummaryStat[];
}

const STAT_ICONS: Record<TournamentSummaryStatKind, LucideIcon> = {
  category: Tag,
  dates: CalendarDays,
  pairs: Users,
  fee: CircleDollarSign,
  circuit: Repeat2,
  zones: MapPin,
  matches: Trophy,
};

export default function TournamentSummaryCard({
  bannerUrl,
  fallbackName,
  stats,
}: TournamentSummaryCardProps) {
  const [flyerOpen, setFlyerOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showFlyer = Boolean(bannerUrl) && !imageFailed;

  return (
    <>
      <section
        className="overflow-hidden rounded-xl border border-border bg-card"
        data-testid="tournament-summary-card"
      >
        <div
          className={
            showFlyer ? "grid lg:grid-cols-[minmax(220px,32%)_minmax(0,1fr)]" : undefined
          }
        >
          {showFlyer ? (
            <div className="relative min-h-56 bg-muted lg:min-h-full">
              <button
                type="button"
                className="absolute inset-0 cursor-pointer"
                aria-label="Ver flyer del torneo"
                data-testid="tournament-flyer"
                onClick={() => setFlyerOpen(true)}
              >
                <img
                  src={bannerUrl ?? ""}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                  onError={() => setImageFailed(true)}
                />
              </button>
            </div>
          ) : null}
          <div className="p-4 sm:p-5">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => {
                const Icon = STAT_ICONS[stat.kind];
                return (
                  <div key={stat.kind} className="space-y-1">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="size-3.5 shrink-0" />
                      <span className="text-sm">{stat.label}</span>
                    </dt>
                    <dd className="text-base font-semibold text-foreground">{stat.value}</dd>
                    {stat.detail ? (
                      <dd className="text-xs text-amber-700">{stat.detail}</dd>
                    ) : null}
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </section>
      {showFlyer ? (
        <ImageViewerDialog
          open={flyerOpen}
          onOpenChange={setFlyerOpen}
          mode="cover"
          title="Flyer del torneo"
          imageUrl={bannerUrl ?? null}
          fallbackName={fallbackName}
        />
      ) : null}
    </>
  );
}
