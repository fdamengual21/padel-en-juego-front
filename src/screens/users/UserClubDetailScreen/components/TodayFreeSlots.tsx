import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import type { PublicClubDetail, PublicClubSlot } from "@/modules/clubs";
import { formatArs } from "@/lib/money";
import { ROUTES } from "@/router/routes";

interface TodayFreeSlotsProps {
  club: PublicClubDetail;
}

export default function TodayFreeSlots({ club }: TodayFreeSlotsProps) {
  const groups = groupByCourt(club.freeSlotsToday);

  return (
    <section className="space-y-3" data-testid="public-club-free-today">
      <h3 className="text-lg font-semibold tracking-tight">Turnos libres de hoy</h3>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No quedan turnos libres en la jornada de hoy.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.courtId} className="space-y-1.5">
              <p className="text-sm font-medium">{group.courtName}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.slots.map((slot) => (
                  <Link
                    key={`${slot.courtId}-${slot.startsAt}`}
                    to={ROUTES.player.clubAvailability(club.id)}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {slot.label}
                    <span className="text-foreground"> · {formatArs(slot.price)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" />
        El calendario muestra si el turno está libre u ocupado, sin decir quién lo reservó.
      </p>
    </section>
  );
}

function groupByCourt(slots: PublicClubSlot[]) {
  const groups: Array<{ courtId: string; courtName: string; slots: PublicClubSlot[] }> = [];
  for (const slot of slots) {
    const current = groups.find((group) => group.courtId === slot.courtId);
    if (current) current.slots.push(slot);
    else groups.push({ courtId: slot.courtId, courtName: slot.courtName, slots: [slot] });
  }
  return groups;
}
