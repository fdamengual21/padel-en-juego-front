import { Search } from "lucide-react";
import { SexIcon, sexChipClassName } from "@/components/sexes";
import { CATEGORY_LEVELS, formatCategoryLevel, type CategoryLevel } from "@/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Sex } from "@/modules/sexes";
import FilterChip from "./FilterChip";

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
    <div className="space-y-3">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <label htmlFor="clients-search" className="sr-only">
          Buscar clientes
        </label>
        <Input
          id="clients-search"
          type="search"
          placeholder="Buscar por nombre, teléfono o email"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-10 px-3 pl-8"
          data-testid="clients-search"
        />
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Categorías</p>
          <div className="flex flex-wrap gap-2" data-testid="clients-category">
            {CATEGORY_LEVELS.map((level) => (
              <FilterChip
                key={level}
                pressed={categoryLevels.includes(level)}
                onClick={() =>
                  onCategoryLevelsChange(
                    toggleValue(categoryLevels, level, CATEGORY_LEVELS.length),
                  )
                }
                testId={`clients-category-${level}`}
              >
                {formatCategoryLevel(level)}
              </FilterChip>
            ))}
          </div>
        </div>

        {sexes.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Sexo</p>
            <div className="flex flex-wrap gap-2" data-testid="clients-sex">
              {sexes.map((sex) => {
                const pressed = sexIds.includes(sex.id);
                return (
                  <FilterChip
                    key={sex.id}
                    pressed={pressed}
                    className={sexChipClassName(sex.code, pressed)}
                    onClick={() =>
                      onSexIdsChange(toggleValue(sexIds, sex.id, sexes.length))
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

        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0"
          disabled={!canClear}
          onClick={onClear}
          data-testid="clients-clear-filters"
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}

function toggleValue<T extends number>(selected: T[], value: T, allCount: number): T[] {
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value].sort((a, b) => a - b);
  if (next.length === allCount) return [];
  return next as T[];
}
