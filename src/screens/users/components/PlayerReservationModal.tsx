import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Court } from "@/domain";
import type { PublicClubSlot, PublicCourt } from "@/modules/clubs";
import type { CourtSlot } from "@/modules/reservations";
import CourtReservationModal from "@/screens/club/ClubCourtsScreen/components/CourtReservationModal";
import { useAuthStore } from "@/stores/authStore";

interface PlayerReservationModalProps {
  clubId: string;
  courts: PublicCourt[];
  slot: PublicClubSlot;
  freeSlots: PublicClubSlot[];
  onClose: () => void;
}

export default function PlayerReservationModal({
  clubId,
  courts,
  slot,
  freeSlots,
  onClose,
}: PlayerReservationModalProps) {
  const session = useMockSession();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const fixedPlayer = useMemo(() => {
    if (user?.playerId) {
      return {
        id: user.playerId,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      };
    }
    if (session.player) {
      return {
        id: session.player.id,
        firstName: session.player.firstName,
        lastName: session.player.lastName,
        phone: session.player.phone,
      };
    }
    return null;
  }, [session.player, user]);

  const agendaCourts = useMemo(
    () => courts.map((court) => toAgendaCourt(clubId, court)),
    [clubId, courts],
  );

  const fixedSlots = useMemo(
    () => freeSlots.filter((item) => item.status === "free").map(toCourtSlot),
    [freeSlots],
  );

  if (!fixedPlayer) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se puede reservar con esta cuenta</DialogTitle>
            <DialogDescription>
              Hace falta un perfil de jugador para pedir el turno a tu nombre.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <CourtReservationModal
      open
      clubId={clubId}
      courts={agendaCourts}
      initialCourtId={slot.courtId}
      mode="create"
      presetStartsAt={slot.startsAt}
      initialDate={dayjs(slot.startsAt).format("YYYY-MM-DD")}
      preselectSlot
      fixedPlayer={fixedPlayer}
      fixedSlots={fixedSlots}
      createTitle="Pedir turno"
      saveLabel="Pedir turno"
      createSuccessMessage="Pedido enviado. Te avisamos cuando el club lo confirme."
      submitCreate={(input) =>
        Api.ClubService().requestPublicReservation(clubId, {
          courtId: input.courtId,
          startsAt: input.startsAt,
        })
      }
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onSaved={() => {
        void queryClient.invalidateQueries({
          queryKey: ["public-club-availability", clubId],
        });
        void queryClient.invalidateQueries({ queryKey: ["public-club", clubId] });
        void queryClient.invalidateQueries({ queryKey: ["player-reservations"] });
      }}
    />
  );
}

function toAgendaCourt(clubId: string, court: PublicCourt): Court {
  return {
    id: court.id,
    clubId,
    name: court.name,
    status: "active",
    imageUrl: court.imageUrl,
    slotDurationMinutes: court.slotDurationMinutes,
    basePrice: court.basePrice,
    priceRules: court.priceRules.map((rule, index) => ({
      id: `${court.id}-rule-${index}`,
      courtId: court.id,
      startTime: rule.startTime,
      endTime: rule.endTime,
      daysOfWeek: rule.daysOfWeek,
      price: rule.price,
      label: rule.label,
    })),
  };
}

function toCourtSlot(slot: PublicClubSlot): CourtSlot {
  return {
    courtId: slot.courtId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    label: slot.label,
    price: slot.price,
    priceLabel: slot.priceLabel,
    status: "available",
  };
}
