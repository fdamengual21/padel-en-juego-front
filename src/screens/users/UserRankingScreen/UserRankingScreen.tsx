import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CircleAlert, Medal, Search } from "lucide-react";
import Api from "@/api/Api";
import { useUser } from "@/app/UserProvider";
import { EmptyState } from "@/components/EmptyState";
import GeographySelectFields from "@/components/GeographySelectFields";
import { RankingCircuitCard } from "@/components/rankings";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { ROUTES } from "@/router/routes";
import { useAuthStore } from "@/stores/authStore";

export default function UserRankingScreen() {
  const { isResolvingUser } = useUser();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const identityKey = isResolvingUser
    ? "pending"
    : token?.trim()
      ? (user?.id ?? "pending")
      : "guest";

  const [search, setSearch] = useState("");
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const [geoSeeded, setGeoSeeded] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setGeoSeeded(false);
    setProvinceId(null);
    setMunicipalityId(null);
  }, [identityKey]);

  useEffect(() => {
    if (identityKey === "pending" || geoSeeded) return;
    setProvinceId(user?.provinceId ?? null);
    setMunicipalityId(user?.municipalityId ?? null);
    setGeoSeeded(true);
  }, [identityKey, geoSeeded, user?.provinceId, user?.municipalityId]);

  const { data = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ["public-rankings", debouncedSearch, provinceId, municipalityId],
    queryFn: () =>
      Api.RankingService().listPublic({
        scope: "all",
        q: debouncedSearch,
        provinceId,
        municipalityId,
      }),
    enabled: geoSeeded,
    placeholderData: keepPreviousData,
  });

  const showLoading = (!geoSeeded || isLoading) && data.length === 0;
  const showLoadError = isError && data.length === 0 && !showLoading;
  const showEmpty = !showLoading && !isError && data.length === 0 && !isFetching;
  const hasActiveFilters = Boolean(debouncedSearch.trim()) || provinceId != null;

  return (
    <div className="space-y-5 p-4 md:p-0" data-testid="player-ranking">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Ranking</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Circuitos en curso y finalizados de los clubes. Entrá a uno para ver la tabla completa.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="rankings-search" className="sr-only">
            Buscar por nombre de club
          </label>
          <Input
            id="rankings-search"
            type="search"
            placeholder="Buscar por nombre de club…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="public-rankings-search"
            className="h-9 pl-8"
          />
        </div>
        <GeographySelectFields
          idPrefix="rankings-geo"
          provinceId={provinceId}
          municipalityId={municipalityId}
          onProvinceChange={setProvinceId}
          onMunicipalityChange={setMunicipalityId}
          municipalityHint={null}
        />
      </div>

      {isFetching && data.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">Actualizando…</p>
      ) : null}

      {showLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}

      {isError && data.length > 0 ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudieron actualizar los rankings"
          className="min-h-0 py-8"
        />
      ) : null}

      {showLoadError ? (
        <EmptyState tone="error" icon={CircleAlert} title="No se pudieron cargar los rankings" />
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={hasActiveFilters ? Search : Medal}
          title={
            hasActiveFilters
              ? "No hay rankings que coincidan con la búsqueda"
              : "Todavía no hay rankings"
          }
          description={
            hasActiveFilters ? undefined : "Cuando un club publique un circuito, va a aparecer acá."
          }
        />
      ) : null}

      {!showLoading && data.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((circuit) => (
            <RankingCircuitCard
              key={circuit.id}
              circuit={circuit}
              to={ROUTES.player.clubRankingDetail(circuit.clubId, circuit.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
