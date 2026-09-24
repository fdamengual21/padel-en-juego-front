import { useCallback, useState } from "react";
import Api from "@/api/Api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAbortableSearch } from "@/hooks/useAbortableSearch";
import type { ReservationPlayer } from "@/modules/reservations";

interface ReservationPlayerFieldProps {
  value: ReservationPlayer | null;
  onChange: (player: ReservationPlayer | null) => void;
}

export default function ReservationPlayerField({
  value,
  onChange,
}: ReservationPlayerFieldProps) {
  const [query, setQuery] = useState("");
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

  if (value) {
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
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="reservation-player">Jugador</Label>
      <Input
        id="reservation-player"
        value={query}
        placeholder="Buscar por nombre"
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
      />
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
    </div>
  );
}
