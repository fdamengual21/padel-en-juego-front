import { Search } from "lucide-react";
import FilterChip, { toggleFilterValue } from "@/components/FilterChip";
import { SexIcon, sexChipClassName } from "@/components/sexes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_LEVELS, formatCategoryLevel, type CategoryLevel } from "@/domain";
import type { Sex } from "@/modules/sexes";

interface ClientsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryLevels: CategoryLevel[];
  onCategoryLevelsChange: (levels: CategoryLevel[]) => void;
  sexIds: number[];
  onSexIdsChange: (ids: number[]) => void;
  sexes: Sex[];
  canClear: boolean;
  onClear: () => void;
}

export default function ClientsFilters({
  search,
  onSearchChange,
  categoryLevels,
  onCategoryLevelsChange,
  sexIds,
  onSexIdsChange,
  sexes,
  canClear,
  onClear,
}: ClientsFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
          <div className="min-w-0 w-full space-y-1.5 sm:flex-1">
            <Label htmlFor="clients-search">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="clients-search"
                type="search"
                placeholder="Buscar por nombre, teléfono o email"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                className="pl-8"
                data-testid="clients-search"
              />
            </div>
          </div>

          {sexes.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none text-foreground">
                Sexo
              </p>
              <div className="flex flex-wrap gap-2" data-testid="clients-sex">
                {sexes.map((sex) => {
                  const pressed = sexIds.includes(sex.id);
                  return (
                    <FilterChip
                      key={sex.id}
                      pressed={pressed}
                      className={sexChipClassName(sex.code, pressed)}
                      onClick={() =>
                        onSexIdsChange(
                          toggleFilterValue(sexIds, sex.id, sexes.length),
                        )
                      }
                      testId={`clients-sex-${sex.id}`}
                    >
                      <SexIcon code={sex.code} inheritColor />
                      {sex.name}
                    </FilterChip>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-sm font-medium leading-none text-foreground">
              Categorías
            </p>
            <div className="flex flex-wrap gap-2" data-testid="clients-category">
              {CATEGORY_LEVELS.map((level) => (
                <FilterChip
                  key={level}
                  pressed={categoryLevels.includes(level)}
                  onClick={() =>
                    onCategoryLevelsChange(
                      toggleFilterValue(
                        categoryLevels,
                        level,
                        CATEGORY_LEVELS.length,
                      ),
                    )
                  }
                  testId={`clients-category-${level}`}
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
            disabled={!canClear}
            onClick={onClear}
            data-testid="clients-clear-filters"
          >
            Limpiar filtros
          </Button>
        </div>
      </div>
    </div>
  );
}
