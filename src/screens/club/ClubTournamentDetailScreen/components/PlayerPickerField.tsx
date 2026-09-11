import { useCallback, useState } from "react";
import type { Player } from "@core-api";
import Api from "@/api/Api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAbortableSearch } from "@/hooks/useAbortableSearch";
import { cn } from "@/lib/utils";

export interface ManualPlayerDraft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export type PlayerSlotValue =
  | { mode: "search"; player: Player | null }
  | { mode: "manual"; draft: ManualPlayerDraft };

export function emptyPlayerSlot(): PlayerSlotValue {
  return { mode: "search", player: null };
}

export function isManualDraftValid(draft: ManualPlayerDraft): boolean {
  return Boolean(draft.firstName.trim() && draft.lastName.trim());
}

export function isPlayerSlotReady(slot: PlayerSlotValue): boolean {
  if (slot.mode === "search") return Boolean(slot.player);
  return isManualDraftValid(slot.draft);
}

interface PlayerPickerFieldProps {
  label: string;
  value: PlayerSlotValue;
  excludeIds?: string[];
  onChange: (value: PlayerSlotValue) => void;
}

export default function PlayerPickerField({
  label,
  value,
  excludeIds = [],
  onChange,
}: PlayerPickerFieldProps) {
  const [query, setQuery] = useState("");

  const selected = value.mode === "search" ? value.player : null;
  const manualOpen = value.mode === "manual";
  const manual =
    value.mode === "manual"
      ? value.draft
      : { firstName: "", lastName: "", phone: "", email: "" };

  const searchFn = useCallback(
    (q: string, signal: AbortSignal) =>
      Api.TournamentOpsService().searchPlayers(q, { signal }),
    [],
  );

  const { results, isSearching, canSearch } = useAbortableSearch<Player>({
    query,
    minLength: 2,
    delayMs: 300,
    enabled: value.mode === "search" && !selected,
    searchFn,
  });

  const filtered = results.filter((p) => !excludeIds.includes(p.id));

  if (selected) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selected.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[selected.phone, selected.email].filter(Boolean).join(" · ") ||
                (selected.userId ? "Usuario registrado" : "Sin cuenta")}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onChange(emptyPlayerSlot());
              setQuery("");
            }}
          >
            Quitar
          </Button>
        </div>
      </div>
    );
  }

  if (manualOpen) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className={cn("space-y-2 rounded-lg border border-dashed border-border p-3")}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium">Alta manual (sin cuenta de usuario)</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onChange(emptyPlayerSlot());
                setQuery("");
              }}
            >
              Cancelar
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`${label}-first`}>Nombre *</Label>
              <Input
                id={`${label}-first`}
                value={manual.firstName}
                onChange={(e) =>
                  onChange({
                    mode: "manual",
                    draft: { ...manual, firstName: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${label}-last`}>Apellido *</Label>
              <Input
                id={`${label}-last`}
                value={manual.lastName}
                onChange={(e) =>
                  onChange({
                    mode: "manual",
                    draft: { ...manual, lastName: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${label}-phone`}>Teléfono</Label>
              <Input
                id={`${label}-phone`}
                value={manual.phone}
                onChange={(e) =>
                  onChange({
                    mode: "manual",
                    draft: { ...manual, phone: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${label}-email`}>Email</Label>
              <Input
                id={`${label}-email`}
                type="email"
                value={manual.email}
                onChange={(e) =>
                  onChange({
                    mode: "manual",
                    draft: { ...manual, email: e.target.value },
                  })
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Se guardará al confirmar la pareja con Guardar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`player-search-${label}`}>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id={`player-search-${label}`}
          className="min-w-0 flex-1"
          value={query}
          placeholder="Buscar por nombre (mín. 2 letras)…"
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 sm:self-stretch"
          onClick={() => {
            const parts = query.trim().split(/\s+/).filter(Boolean);
            onChange({
              mode: "manual",
              draft: {
                firstName: parts[0] ?? "",
                lastName: parts.slice(1).join(" "),
                phone: "",
                email: "",
              },
            });
          }}
        >
          Cargar manualmente
        </Button>
      </div>

      {canSearch ? (
        <div className="rounded-lg border border-border bg-card">
          {isSearching ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
          ) : filtered.length > 0 ? (
            <ul className="max-h-40 overflow-y-auto divide-y divide-border">
              {filtered.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/50"
                    onClick={() => {
                      onChange({ mode: "search", player });
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">{player.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {[player.phone, player.email].filter(Boolean).join(" · ") ||
                        "Sin contacto"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No existe un jugador con “{query.trim()}”. Podés cargarlo
              manualmente.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Escribí al menos 2 caracteres.</p>
      )}
    </div>
  );
}
