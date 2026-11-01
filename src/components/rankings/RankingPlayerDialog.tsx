import { useState } from "react";
import { Link } from "react-router-dom";
import PersonDetailCard from "@/components/person/PersonDetailCard";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCategoryLevel, isCategoryLevel, playerSidePreferenceLabel } from "@/domain";
import { cn } from "@/lib/utils";
import type { ClubRankingStanding } from "@/modules/rankings";
import { ROUTES } from "@/router/routes";
import type { RankingStandingsSource } from "./RankingStandingsTable";

interface RankingPlayerDialogProps {
  row: ClubRankingStanding | null;
  totalDates: number;
  source: RankingStandingsSource;
  onOpenChange: (open: boolean) => void;
}

/** Resumen del jugador desde la tabla: ficha, categoría, contacto y su lugar en el ranking. */
export default function RankingPlayerDialog({
  row,
  totalDates,
  source,
  onOpenChange,
}: RankingPlayerDialogProps) {
  const [shown, setShown] = useState(row);
  if (row && row !== shown) setShown(row);
  const current = row ?? shown;
  const player = current?.player;
  const name = player ? `${player.firstName} ${player.lastName}`.trim() || "Jugador" : "";
  const category = isCategoryLevel(player?.categoryLevel)
    ? formatCategoryLevel(player.categoryLevel)
    : null;
  const side = playerSidePreferenceLabel(player?.sidePreference);
  const phone = player?.phone?.trim() || null;
  const profileUserId = source === "public" ? (player?.userId ?? null) : null;

  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-w-xl flex-col gap-0 overflow-hidden p-0"
        data-testid="ranking-player-dialog"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
          <DialogTitle>Jugador del ranking</DialogTitle>
          <DialogDescription>Su ficha y cómo viene en la tabla.</DialogDescription>
        </DialogHeader>

        {current && player ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
            <PersonDetailCard
              name={name}
              avatarUrl={player.avatarUrl}
              badges={[
                category ? { label: `Categoría ${category}` } : { label: "Sin categoría", plain: true },
                ...(side ? [{ label: `Lado ${side}` }] : []),
              ]}
              fields={[
                {
                  label: "Teléfono",
                  value: phone ?? (source === "public" ? "No es público" : "Sin teléfono"),
                  phone,
                },
              ]}
            />

            <div className="grid grid-cols-3 gap-3">
              <Stat label="Puesto" value={`${current.place}°`} />
              <Stat label="Puntos" value={current.points.toLocaleString("es-AR")} />
              <Stat label="Fechas" value={`${current.datesPlayed}/${totalDates}`} />
            </div>
          </div>
        ) : null}

        {profileUserId ? (
          <DialogFooter className="shrink-0 border-t border-border px-4 py-4">
            <Link
              to={ROUTES.player.playerProfile(profileUserId)}
              className={cn(buttonVariants({ variant: "outline" }))}
              data-testid="ranking-player-profile-link"
            >
              Ver perfil
            </Link>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
