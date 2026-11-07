import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CircleAlert, Search } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import GeographySelectFields from "@/components/GeographySelectFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublicGeoListUrlState } from "@/hooks/usePublicGeoListUrlState";
import type { PublicClubListItem } from "@/modules/clubs";
import ClubListCard from "./components/ClubListCard";
import ClubsPagination from "./components/ClubsPagination";

const PAGE_SIZE = 12;

export default function UserClubsScreen() {
  const {
    state,
    searchInput,
    setSearchInput,
    ready,
    hasActiveFilters,
    canClearFilters,
    clearFilters,
    setProvinceId,
    setMunicipalityId,
    setPage,
  } = usePublicGeoListUrlState();

  const [items, setItems] = useState<PublicClubListItem[]>([]);
  const appendRef = useRef(false);
  const { q, provinceId, municipalityId, page } = state;

  useEffect(() => {
    appendRef.current = false;
    setItems([]);
  }, [q, provinceId, municipalityId]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["public-clubs", q, provinceId, municipalityId, page, PAGE_SIZE],
    queryFn: () =>
      Api.ClubService().listPublic({
        q,
        provinceId,
        municipalityId,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: ready,
  });

  useEffect(() => {
    if (!data) return;
    setItems((prev) =>
      appendRef.current && data.page > 1 ? [...prev, ...data.items] : data.items,
    );
    appendRef.current = false;
  }, [data]);

  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;
  const showSkeletons = (!ready || isLoading) && items.length === 0;
  const showLoadError = isError && items.length === 0 && !showSkeletons;
  const showEmpty =
    !showSkeletons && !isError && items.length === 0 && !isFetching;

  return (
    <div className="space-y-5 p-4 md:p-0" data-testid="player-clubs">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Clubes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Encontrá predios, horarios y turnos disponibles hoy.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start md:gap-0">
          <div className="min-w-0 space-y-1.5 md:pr-4">
            <Label htmlFor="clubs-search">Buscar</Label>
            <div className="relative min-w-0 w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="clubs-search"
                type="search"
                placeholder="Buscar por nombre o localidad…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                data-testid="public-clubs-search"
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <div className="min-w-0 flex-1">
              <GeographySelectFields
                idPrefix="clubs-geo"
                provinceId={provinceId}
                municipalityId={municipalityId}
                onProvinceChange={setProvinceId}
                onMunicipalityChange={setMunicipalityId}
                municipalityHint={null}
                className="grid-cols-2"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-8 w-full shrink-0 sm:w-auto"
              disabled={!canClearFilters}
              onClick={clearFilters}
              data-testid="public-clubs-clear-filters"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      </div>

      {isFetching && items.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">Actualizando…</p>
      ) : null}

      {isError && items.length > 0 ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudieron cargar los clubes."
          className="min-h-0 py-8"
        />
      ) : null}

      {showLoadError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudieron cargar los clubes."
        />
      ) : null}

      {showSkeletons || items.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          {showSkeletons
            ? Array.from({ length: PAGE_SIZE }, (_, i) => (
              <ClubCardSkeleton key={`sk-${i}`} />
            ))
            : items.map((club) => <ClubListCard key={club.id} club={club} />)}
        </div>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={hasActiveFilters ? Search : Building2}
          title={
            hasActiveFilters
              ? "No hay clubes que coincidan con la búsqueda."
              : "Todavía no hay clubes para mostrar."
          }
        />
      ) : null}

      <ClubsPagination
        page={data?.page ?? page}
        totalPages={totalPages}
        totalItems={totalItems}
        loadedCount={items.length}
        disabled={isFetching}
        onPageChange={(next) => {
          appendRef.current = false;
          setPage(next);
        }}
        onLoadMore={() => {
          appendRef.current = true;
          setPage(page + 1);
        }}
      />
    </div>
  );
}

function ClubCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card md:flex-row"
      aria-hidden
    >
      <div className="h-16 w-full shrink-0 animate-pulse bg-muted md:h-24 md:w-1/3" />
      <div className="flex-1 space-y-1.5 p-2 md:p-2.5">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
