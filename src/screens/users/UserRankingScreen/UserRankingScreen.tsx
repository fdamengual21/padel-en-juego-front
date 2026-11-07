import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CircleAlert, LoaderCircle, Medal, Search } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import FilterChip, { toggleFilterValue } from "@/components/FilterChip";
import GeographySelectFields from "@/components/GeographySelectFields";
import { RankingCircuitCard } from "@/components/rankings";
import { SexIcon, sexChipClassName } from "@/components/sexes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORY_GENDERS,
  CATEGORY_LEVELS,
  categoryGenderSexCode,
  formatCategoryGender,
  formatCategoryLevel,
} from "@/domain";
import { usePublicGeoListUrlState } from "@/hooks/usePublicGeoListUrlState";
import { ROUTES } from "@/router/routes";

export default function UserRankingScreen() {
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
    setCategoryLevels,
    setGenders,
  } = usePublicGeoListUrlState({ includePage: false });

  const { q, provinceId, municipalityId, categoryLevels, genders } = state;

  const { data = [], isLoading, isFetching, isError } = useQuery({
    queryKey: [
      "public-rankings",
      q,
      provinceId,
      municipalityId,
      categoryLevels,
      genders,
    ],
    queryFn: () =>
      Api.RankingService().listPublic({
        scope: "all",
        q,
        provinceId,
        municipalityId,
        levels: categoryLevels,
        genders,
      }),
    enabled: ready,
    placeholderData: keepPreviousData,
  });

  const showLoading = (!ready || isLoading) && data.length === 0;
  const showLoadError = isError && data.length === 0 && !showLoading;
  const showEmpty = !showLoading && !isError && data.length === 0 && !isFetching;

  return (
    <div className="space-y-5 p-4 md:p-0" data-testid="player-ranking">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Ranking</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Circuitos en curso y finalizados de los clubes. Entrá a uno para ver la
          tabla completa.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start md:gap-0">
          <div className="min-w-0 md:pr-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
              <div className="min-w-0 w-full space-y-1.5 sm:flex-1">
                <Label htmlFor="rankings-search">Buscar</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="rankings-search"
                    type="search"
                    placeholder="Ranking o club…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    data-testid="public-rankings-search"
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium leading-none text-foreground">
                  Sexo
                </p>
                <div
                  className="flex shrink-0 flex-wrap gap-2"
                  data-testid="public-rankings-gender"
                  role="group"
                  aria-label="Sexo de la categoría"
                >
                  {CATEGORY_GENDERS.map((gender) => {
                    const pressed = genders.includes(gender);
                    const sexCode = categoryGenderSexCode(gender);
                    return (
                      <FilterChip
                        key={gender}
                        pressed={pressed}
                        className={sexChipClassName(sexCode, pressed)}
                        onClick={() =>
                          setGenders(
                            toggleFilterValue(
                              genders,
                              gender,
                              CATEGORY_GENDERS.length,
                            ),
                          )
                        }
                        testId={`public-rankings-gender-${gender}`}
                      >
                        <SexIcon code={sexCode} inheritColor />
                        {formatCategoryGender(gender)}
                      </FilterChip>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <GeographySelectFields
              idPrefix="rankings-geo"
              provinceId={provinceId}
              municipalityId={municipalityId}
              onProvinceChange={setProvinceId}
              onMunicipalityChange={setMunicipalityId}
              municipalityHint={null}
              className="grid-cols-1 sm:grid-cols-1 xl:grid-cols-2"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-sm font-medium leading-none text-foreground">
              Categorías
            </p>
            <div
              className="flex flex-wrap gap-2"
              data-testid="public-rankings-category"
              role="group"
              aria-label="Categorías"
            >
              {CATEGORY_LEVELS.map((level) => (
                <FilterChip
                  key={level}
                  pressed={categoryLevels.includes(level)}
                  onClick={() =>
                    setCategoryLevels(
                      toggleFilterValue(
                        categoryLevels,
                        level,
                        CATEGORY_LEVELS.length,
                      ),
                    )
                  }
                  testId={`public-rankings-category-${level}`}
                >
                  {formatCategoryLevel(level)}
                </FilterChip>
              ))}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-full shrink-0 sm:w-auto"
            disabled={!canClearFilters}
            onClick={clearFilters}
            data-testid="public-rankings-clear-filters"
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      {isFetching && data.length > 0 ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {showLoading ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando rankings</p>
        </div>
      ) : null}

      {isError && data.length > 0 ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudieron actualizar los rankings"
          className="min-h-0 py-8"
        />
      ) : null}

      {showLoadError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudieron cargar los rankings"
        />
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
            hasActiveFilters
              ? undefined
              : "Cuando un club publique un circuito, va a aparecer acá."
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
