import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import AutocompleteField from "@/components/AutocompleteField";
import { Label } from "@/components/ui/label";

interface ProvinceCityFieldsProps {
  province: string;
  city: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
  provinceError?: string;
  cityError?: string;
  disabled?: boolean;
  idPrefix?: string;
}

/** Par provincia + localidad con select searchable. */
export default function ProvinceCityFields({
  province,
  city,
  onProvinceChange,
  onCityChange,
  provinceError,
  cityError,
  disabled = false,
  idPrefix = "loc",
}: ProvinceCityFieldsProps) {
  const { data: provinces = [], isLoading: loadingProvinces } = useQuery({
    queryKey: ["locations", "provinces"],
    queryFn: () => Api.TournamentOpsService().listProvinces(),
  });

  const { data: cities = [], isLoading: loadingCities } = useQuery({
    queryKey: ["locations", "cities", province],
    queryFn: () => Api.TournamentOpsService().listCities(province),
    enabled: Boolean(province.trim()),
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-province`}>Provincia</Label>
        <AutocompleteField
          id={`${idPrefix}-province`}
          data-testid={`${idPrefix}-province`}
          options={provinces}
          value={province}
          disabled={disabled || loadingProvinces}
          placeholder="Buscar provincia…"
          emptyMessage="Sin provincias"
          aria-invalid={Boolean(provinceError)}
          onChange={(name) => {
            onProvinceChange(name);
            if (name !== province) onCityChange("");
          }}
        />
        {provinceError ? (
          <p className="text-xs text-destructive">{provinceError}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>Localidad</Label>
        <AutocompleteField
          id={`${idPrefix}-city`}
          data-testid={`${idPrefix}-city`}
          options={cities.map((c) => ({ id: c.id, name: c.name }))}
          value={city}
          disabled={disabled || !province.trim() || loadingCities}
          placeholder={
            province.trim() ? "Buscar localidad…" : "Primero elegí provincia"
          }
          emptyMessage={
            province.trim() ? "Sin localidades" : "Elegí una provincia primero"
          }
          aria-invalid={Boolean(cityError)}
          onChange={onCityChange}
        />
        {cityError ? (
          <p className="text-xs text-destructive">{cityError}</p>
        ) : null}
      </div>
    </div>
  );
}
