import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Plus } from "lucide-react";
import Api from "@/api/Api";
import { PERMISSION_CLUB_CLIENTS_WRITE } from "@/authorization";
import { PermissionsGuard } from "@/components/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAbortableSearch } from "@/hooks/useAbortableSearch";
import type { ReservationPlayer } from "@/modules/reservations";
import ClientFormDialog from "@/screens/club/ClubClientsScreen/components/ClientFormDialog";

interface ReservationPlayerFieldProps {
  value: ReservationPlayer | null;
  onChange: (player: ReservationPlayer | null) => void;
}

function playerNoteText(note: string | null | undefined): string {
  return note?.trim() ?? "";
}

export default function ReservationPlayerField({
  value,
  onChange,
}: ReservationPlayerFieldProps) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const searchFn = useCallback(
    (q: string) => Api.ReservationService().searchPlayers(q),
    [],
  );
  const { results, isSearching } = useAbortableSearch<ReservationPlayer>({
    query,
    minLength: 2,
    enabled: value == null,
    searchFn,
  });
  const selectedPlayerId = value?.id ?? "";
  const noteQuery = useQuery({
    queryKey: ["club-client", selectedPlayerId],
    queryFn: () => Api.ClientService().getById(selectedPlayerId),
    enabled: Boolean(selectedPlayerId) && !playerNoteText(value?.note),
    retry: false,
  });

  if (value) {
    const note = playerNoteText(value.note) || playerNoteText(noteQuery.data?.note);
    return (
      <div className="space-y-1.5">
        <Label>Jugador</Label>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <span className="font-medium">
            {value.firstName} {value.lastName}
          </span>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => onChange(null)}
          >
            Cambiar
          </button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">Nota</p>
            <Info className="size-3.5 text-muted-foreground" aria-hidden />
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {note || "—"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="reservation-player">Jugador</Label>
      <div className="flex items-center gap-2">
        <Input
          id="reservation-player"
          className="min-w-0 flex-1"
          value={query}
          placeholder="Buscar por nombre"
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <PermissionsGuard permission={PERMISSION_CLUB_CLIENTS_WRITE}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Añadir jugador"
            onClick={() => setCreating(true)}
          >
            <Plus />
          </Button>
        </PermissionsGuard>
      </div>
      {query.trim().length >= 2 ? (
        <div className="max-h-40 overflow-auto rounded-lg border border-border">
          {isSearching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No hay jugadores con ese nombre.
            </p>
          ) : (
            results.map((player) => (
              <button
                key={player.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange(player);
                  setQuery("");
                }}
              >
                {player.firstName} {player.lastName}
              </button>
            ))
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Escribí al menos dos letras del nombre.
        </p>
      )}
      <ClientFormDialog
        open={creating}
        clientId={null}
        onOpenChange={setCreating}
        onSaved={(saved) => {
          if (!saved) return;
          onChange({
            id: saved.id,
            firstName: saved.firstName,
            lastName: saved.lastName,
            phone: saved.phone,
            note: saved.note,
          });
          setQuery("");
        }}
      />
    </div>
  );
}
