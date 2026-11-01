import { useState } from "react";
import { CalendarDays, Image as ImageIcon, MapPin, Phone, Tag } from "lucide-react";
import ImageViewerDialog from "@/components/ImageViewerDialog";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { formatTournamentDayEs } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { whatsappUrl } from "@/lib/whatsapp";
import { rankingScheduleLabel, type ClubRankingCircuit } from "@/modules/rankings";
import RankingPrizesDialog from "./RankingPrizesDialog";
import RankingRulesDialog from "./RankingRulesDialog";

const heroButton =
  "border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-sidebar-foreground/20 hover:text-sidebar-foreground";

interface RankingHeroProps {
  circuit: ClubRankingCircuit;
}

/** Cabecera del ranking: portada del club con velo navy, datos clave y accesos a premios, reglamento y flyer. */
export default function RankingHero({ circuit }: RankingHeroProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [flyerOpen, setFlyerOpen] = useState(false);
  const showCover = Boolean(circuit.clubCoverUrl) && !coverFailed;
  const phone = circuit.clubPhone?.trim() || null;
  const whatsappHref = whatsappUrl(phone);

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground"
      data-testid="ranking-hero"
    >
      {showCover ? (
        <img
          src={circuit.clubCoverUrl ?? ""}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setCoverFailed(true)}
        />
      ) : null}
      <div
        className={cn(
          "absolute inset-0",
          showCover && "bg-gradient-to-r from-sidebar via-sidebar/85 to-sidebar/40",
        )}
      />
      <div className="relative z-10 flex min-h-40 flex-col justify-end gap-4 p-4 sm:min-h-48 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="min-w-0 space-y-2">
          <span className="inline-flex rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            Ranking
          </span>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{circuit.name}</h2>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-sidebar-foreground/80">
            <li className="inline-flex items-center gap-1.5">
              <Tag className="size-3.5 shrink-0" />
              {circuit.categoryName}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              {circuit.weekCount} fechas · {rankingScheduleLabel(circuit)} · desde{" "}
              {formatTournamentDayEs(circuit.firstDate)}
            </li>
            {circuit.clubName ? (
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                {circuit.clubName}
              </li>
            ) : null}
            {phone ? (
              <li className="inline-flex">
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Escribir al club por WhatsApp: ${phone}`}
                    className="-my-0.5 inline-flex items-center gap-1.5 rounded-md bg-sidebar-foreground/10 px-2 py-0.5 text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/20 focus-visible:outline-2 focus-visible:outline-sidebar-ring"
                    data-testid="ranking-club-contact"
                  >
                    <Phone className="size-3.5 shrink-0" />
                    <span className="tabular-nums">{phone}</span>
                    <WhatsAppIcon className="size-4 shrink-0" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="tabular-nums">{phone}</span>
                  </span>
                )}
              </li>
            ) : null}
          </ul>
          {circuit.description ? (
            <p className="line-clamp-2 max-w-2xl text-sm text-sidebar-foreground/80">
              {circuit.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <RankingPrizesDialog prizes={circuit.prizes ?? []} triggerClassName={heroButton} />
          <RankingRulesDialog categoryName={circuit.categoryName} triggerClassName={heroButton} />
          {circuit.flyerUrl ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={heroButton}
              onClick={() => setFlyerOpen(true)}
              data-testid="ranking-flyer-button"
            >
              <ImageIcon className="size-4" />
              Ver flyer
            </Button>
          ) : null}
        </div>
      </div>
      {circuit.flyerUrl ? (
        <ImageViewerDialog
          open={flyerOpen}
          onOpenChange={setFlyerOpen}
          mode="cover"
          title="Flyer del ranking"
          imageUrl={circuit.flyerUrl}
          fallbackName={circuit.name}
        />
      ) : null}
    </section>
  );
}
