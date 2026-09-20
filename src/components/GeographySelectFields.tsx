import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import AutocompleteField from "@/components/AutocompleteField";
import { Label } from "@/components/ui/label";

interface GeographySelectFieldsProps {
  provinceId: number | null;
  municipalityId: number | null;
  onProvinceChange: (provinceId: number | null) => void;
  onMunicipalityChange: (municipalityId: number | null) => void;
  provinceError?: string;
  municipalityError?: string;
  disabled?: boolean;
  required?: boolean;
  idPrefix?: string;
  /** Texto bajo localidad. Null oculta el hint. */
  municipalityHint?: string | null;
}

/** Provincia + municipio desde la API (ids). Ambos opcionales. */
export default function GeographySelectFields({
  provinceId,
  municipalityId,
  onProvinceChange,
  onMunicipalityChange,
  provinceError,
  municipalityError,
  disabled = false,
  required = false,
  idPrefix = "geo",
  municipalityHint = "Si no aparece tu localidad, dejá estos campos vacíos.",
}: GeographySelectFieldsProps) {
  const { data: provinces = [], isLoading: loadingProvinces } = useQuery({
    queryKey: ["geography", "provinces"],
    queryFn: () => Api.GeographyService().listProvinces(),
  });

  const { data: municipalities = [], isLoading: loadingMunicipalities } =
    useQuery({
      queryKey: ["geography", "municipalities", provinceId],
      queryFn: () => Api.GeographyService().listMunicipalities(provinceId!),
      enabled: provinceId != null,
    });

  const selectedProvince =
    provinces.find((item) => item.id === provinceId) ?? null;
  const selectedMunicipality =
    municipalities.find((item) => item.id === municipalityId) ?? null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-province`}>
          {required ? "Provincia" : "Provincia (opcional)"}
          {required ? (
            <span className="text-destructive" aria-hidden>
              *
            </span>
          ) : null}
        </Label>
        <AutocompleteField
          id={`${idPrefix}-province`}
          data-testid={`${idPrefix}-province`}
          options={provinces.map((item) => ({
            id: String(item.id),
            name: item.name,
          }))}
          value={selectedProvince?.name ?? ""}
          disabled={disabled || loadingProvinces}
          placeholder="Buscar provincia…"
          emptyMessage="Sin provincias"
          aria-invalid={Boolean(provinceError)}
          onChange={(name) => {
            const next = provinces.find((item) => item.name === name) ?? null;
            onProvinceChange(next?.id ?? null);
            if (next?.id !== provinceId) onMunicipalityChange(null);
          }}
        />
        {provinceError ? (
          <p className="text-xs text-destructive">{provinceError}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>
          {required ? "Localidad" : "Localidad (opcional)"}
          {required ? (
            <span className="text-destructive" aria-hidden>
              *
            </span>
          ) : null}
        </Label>
        <AutocompleteField
          id={`${idPrefix}-city`}
          data-testid={`${idPrefix}-city`}
          options={municipalities.map((item) => ({
            id: String(item.id),
            name: item.name,
          }))}
          value={selectedMunicipality?.name ?? ""}
          disabled={disabled || provinceId == null || loadingMunicipalities}
          placeholder={
            provinceId != null ? "Buscar localidad…" : "Primero elegí provincia"
          }
          emptyMessage={
            provinceId != null
              ? "Sin localidades cargadas"
              : "Elegí una provincia primero"
          }
          aria-invalid={Boolean(municipalityError)}
          onChange={(name) => {
            const next =
              municipalities.find((item) => item.name === name) ?? null;
            onMunicipalityChange(next?.id ?? null);
          }}
        />
        {municipalityError ? (
          <p className="text-xs text-destructive">{municipalityError}</p>
        ) : municipalityHint ? (
          <p className="text-xs text-muted-foreground">{municipalityHint}</p>
        ) : null}
      </div>
    </div>
  );
}
