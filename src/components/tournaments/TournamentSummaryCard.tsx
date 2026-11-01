import { useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  MapPin,
  Medal,
  Phone,
  Repeat2,
  Tag,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import ImageViewerDialog from "@/components/ImageViewerDialog";
import PhoneWhatsApp from "@/components/PhoneWhatsApp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type TournamentSummaryStatKind =
  | "category"
  | "dates"
  | "pairs"
  | "fee"
  | "circuit"
  | "ranking"
  | "registrationOpens"
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
  description?: string | null;
  contactPhone?: string | null;
  stats: TournamentSummaryStat[];
}

const DESCRIPTION_PREVIEW_LENGTH = 100;
const MOBILE_VISIBLE_STATS = 4;

const STAT_ICONS: Record<TournamentSummaryStatKind, LucideIcon> = {
  category: Tag,
  dates: CalendarDays,
  pairs: Users,
  fee: CircleDollarSign,
  circuit: Repeat2,
  ranking: Medal,
  registrationOpens: CalendarClock,
  zones: MapPin,
  matches: Trophy,
};

export default function TournamentSummaryCard({
  bannerUrl,
  fallbackName,
  description,
  contactPhone,
  stats,
}: TournamentSummaryCardProps) {
  const [flyerOpen, setFlyerOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const showFlyer = Boolean(bannerUrl) && !imageFailed;
  const trimmedContactPhone = contactPhone?.trim() ?? "";
  const statCount = stats.length + (trimmedContactPhone ? 1 : 0);
  const hasCollapsedStats = statCount > MOBILE_VISIBLE_STATS;
  const collapsedClass = (index: number) =>
    !statsExpanded && index >= MOBILE_VISIBLE_STATS ? "hidden sm:block" : undefined;
  const trimmedDescription = description?.trim() ?? "";
  const isDescriptionTruncated = trimmedDescription.length > DESCRIPTION_PREVIEW_LENGTH;
  const descriptionPreview = isDescriptionTruncated
    ? `${trimmedDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH)}...`
    : trimmedDescription;

  return (
    <>
      <section
        className="overflow-hidden rounded-xl border border-border bg-card"
        data-testid="tournament-summary-card"
      >
        {trimmedDescription ? (
          isDescriptionTruncated ? (
            <button
              type="button"
              className="block w-full cursor-pointer border-b border-border px-4 py-3 text-left text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground sm:px-5"
              aria-label="Ver descripción del torneo"
              onClick={() => setDescriptionOpen(true)}
              data-testid="tournament-description-preview"
            >
              {descriptionPreview}
            </button>
          ) : (
            <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground sm:px-5">
              {descriptionPreview}
            </p>
          )
        ) : null}
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
            <dl className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 lg:grid-cols-3">
              {stats.map((stat, index) => {
                const Icon = STAT_ICONS[stat.kind];
                return (
                  <div key={stat.kind} className={cn("min-w-0 space-y-1", collapsedClass(index))}>
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="size-3.5 shrink-0" />
                      <span className="text-sm">{stat.label}</span>
                    </dt>
                    <dd className="text-sm font-semibold break-words text-foreground sm:text-base">
                      {stat.value}
                    </dd>
                    {stat.detail ? (
                      <dd className="text-xs text-amber-700">{stat.detail}</dd>
                    ) : null}
                  </div>
                );
              })}
              {trimmedContactPhone ? (
                <div
                  className={cn("min-w-0 space-y-1", collapsedClass(stats.length))}
                  data-testid="tournament-contact"
                >
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="text-sm">Contacto</span>
                  </dt>
                  <dd className="text-sm font-semibold break-words text-foreground sm:text-base">
                    <PhoneWhatsApp phone={trimmedContactPhone} />
                  </dd>
                </div>
              ) : null}
            </dl>
            {hasCollapsedStats ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 w-full sm:hidden"
                aria-expanded={statsExpanded}
                onClick={() => setStatsExpanded((open) => !open)}
                data-testid="tournament-summary-toggle"
              >
                {statsExpanded ? "Ver menos" : "Ver más"}
              </Button>
            ) : null}
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
      {isDescriptionTruncated ? (
        <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
          <DialogContent
            className="max-w-lg"
            data-testid="tournament-description-dialog"
          >
            <DialogHeader>
              <DialogTitle>Descripción</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap text-foreground">
                {trimmedDescription}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
