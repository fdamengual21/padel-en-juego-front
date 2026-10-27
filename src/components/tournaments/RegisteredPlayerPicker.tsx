import { useCallback, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import Api from "@/api/Api";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RegisteredPlayerSearchItem } from "@/domain";
import { formatCategoryLevel, isCategoryLevel } from "@/domain";
import { useAbortableSearch } from "@/hooks/useAbortableSearch";

interface RegisteredPlayerPickerProps {
  value: RegisteredPlayerSearchItem | null;
  onChange: (player: RegisteredPlayerSearchItem | null) => void;
}

function categoryLabel(level: RegisteredPlayerSearchItem["categoryLevel"]): string {
  return isCategoryLevel(level) ? formatCategoryLevel(level) : "Sin categoría";
}

export default function RegisteredPlayerPicker({
  value,
  onChange,
}: RegisteredPlayerPickerProps) {
  const [query, setQuery] = useState("");

  const searchFn = useCallback(
    (q: string, signal: AbortSignal) =>
      Api.TournamentOpsService().searchRegisteredPlayers(q, { signal }),
    [],
  );

  const { results, isSearching, canSearch, debouncedQuery } = useAbortableSearch<
    RegisteredPlayerSearchItem
  >({
    query,
    minLength: 2,
    delayMs: 300,
    enabled: value == null,
    searchFn,
  });

  const pendingSearch =
    query.trim().length >= 2 &&
    (isSearching || query.trim() !== debouncedQuery.trim());

  if (value) {
    return (
      <div className="space-y-1.5">
        <Label>Compañero</Label>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={value.fullName} imageUrl={value.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{value.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[categoryLabel(value.categoryLevel), value.phone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
          >
            Cambiar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="registered-player-search">Compañero</Label>
      <div className="relative">
        <Input
          id="registered-player-search"
          className="pr-8"
          value={query}
          placeholder="Nombre, DNI o teléfono…"
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        {pendingSearch ? (
          <LoaderCircle className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            className="absolute top-1/2 right-1 inline-flex size-6 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery("")}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {canSearch && !pendingSearch ? (
        <div className="rounded-lg border border-border bg-card">
          {results.length > 0 ? (
            <ul className="max-h-48 divide-y divide-border overflow-y-auto">
              {results.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
                    onClick={() => {
                      onChange(player);
                      setQuery("");
                    }}
                  >
                    <Avatar
                      name={player.fullName}
                      imageUrl={player.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {player.fullName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {categoryLabel(player.categoryLevel)}
                        {player.phone ? ` · ${player.phone}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No hay un jugador registrado con “{query.trim()}”.
            </p>
          )}
        </div>
      ) : query.trim().length < 2 ? (
        <p className="text-xs text-muted-foreground">
          Escribí al menos 2 caracteres. Podés buscar por nombre, DNI o teléfono.
        </p>
      ) : null}
    </div>
  );
}
