import { useCallback, useState } from "react";
import type { CategoryLevel, Client } from "@/domain";
import Api from "@/api/Api";
import PlayerIdentityFields, {
  emptyPlayerIdentityValues,
  isClubManualIdentityValid,
  type PlayerIdentityValues,
} from "@/components/auth/PlayerIdentityFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAbortableSearch } from "@/hooks/useAbortableSearch";
import { cn } from "@/lib/utils";

export interface ManualClientDraft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  age: string;
  categoryLevel: CategoryLevel;
}

export type ClientSlotValue =
  | { mode: "search"; client: Client | null }
  | { mode: "manual"; draft: ManualClientDraft };

export function emptyClientSlot(): ClientSlotValue {
  return { mode: "search", client: null };
}

export function isManualClientDraftValid(draft: ManualClientDraft): boolean {
  return isClubManualIdentityValid(draft);
}

export function isClientSlotReady(slot: ClientSlotValue): boolean {
  if (slot.mode === "search") return Boolean(slot.client);
  return isManualClientDraftValid(slot.draft);
}

function draftToIdentity(draft: ManualClientDraft): PlayerIdentityValues {
  return {
    firstName: draft.firstName,
    lastName: draft.lastName,
    age: draft.age,
    email: draft.email,
    categoryLevel: draft.categoryLevel,
    phone: draft.phone,
  };
}

function identityToDraft(values: PlayerIdentityValues): ManualClientDraft {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    age: values.age,
    email: values.email,
    categoryLevel: values.categoryLevel,
    phone: values.phone ?? "",
  };
}

interface ClientPickerFieldProps {
  clubId: string;
  label?: string;
  value: ClientSlotValue;
  onChange: (value: ClientSlotValue) => void;
}

export default function ClientPickerField({
  clubId,
  label = "Cliente",
  value,
  onChange,
}: ClientPickerFieldProps) {
  const [query, setQuery] = useState("");
  const selected = value.mode === "search" ? value.client : null;
  const manualOpen = value.mode === "manual";
  const manual =
    value.mode === "manual"
      ? value.draft
      : {
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          age: "",
          categoryLevel: 6 as CategoryLevel,
        };

  const searchFn = useCallback(
    (q: string, signal: AbortSignal) =>
      Api.TournamentOpsService().searchClubClients(clubId, q, { signal }),
    [clubId],
  );

  const { results, isSearching, canSearch } = useAbortableSearch<Client>({
    query,
    minLength: 2,
    delayMs: 300,
    enabled: value.mode === "search" && !selected,
    searchFn,
  });

  if (selected) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selected.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[selected.phone, selected.email].filter(Boolean).join(" · ") ||
                "Sin contacto"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(emptyClientSlot())}
          >
            Cambiar
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
            <p className="text-xs font-medium">
              Alta manual — solo nombre y apellido son obligatorios
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onChange(emptyClientSlot());
                setQuery("");
              }}
            >
              Cancelar
            </Button>
          </div>
          <PlayerIdentityFields
            mode="club"
            idPrefix="client-manual"
            values={draftToIdentity(manual)}
            onChange={(next) =>
              onChange({ mode: "manual", draft: identityToDraft(next) })
            }
          />
          <p className="text-xs text-muted-foreground">
            Si cargás email o teléfono y ya existen, te vamos a avisar al
            guardar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="client-search">{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id="client-search"
          className="min-w-0 flex-1"
          value={query}
          placeholder="Buscar cliente (mín. 2 letras)…"
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
            const base = emptyPlayerIdentityValues({
              firstName: parts[0] ?? "",
              lastName: parts.slice(1).join(" "),
            });
            onChange({ mode: "manual", draft: identityToDraft(base) });
          }}
        >
          Cargar manualmente
        </Button>
      </div>

      {canSearch ? (
        <div className="rounded-lg border border-border bg-card">
          {isSearching ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
          ) : results.length > 0 ? (
            <ul className="max-h-40 overflow-y-auto divide-y divide-border">
              {results.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/50"
                    onClick={() => {
                      onChange({ mode: "search", client });
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">{client.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {[client.phone, client.email].filter(Boolean).join(" · ") ||
                        "Sin contacto"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No hay clientes con “{query.trim()}”. Podés cargarlo manualmente.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Escribí al menos 2 caracteres.</p>
      )}
    </div>
  );
}
