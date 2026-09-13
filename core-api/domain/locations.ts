import locationsSeed from "../data/locations.json";
import type { LocationCity, LocationProvince } from "../types";

const provinces: LocationProvince[] = locationsSeed.provinces.map((p) => ({
  id: p.id,
  name: p.name,
  cities: p.cities.map((c) => ({
    id: c.id,
    name: c.name,
    provinceId: p.id,
  })),
}));

export function listProvincesFromCatalog(): LocationProvince[] {
  return provinces.map(({ id, name, cities }) => ({
    id,
    name,
    cities: [...cities],
  }));
}

export function listCitiesFromCatalog(
  provinceIdOrName: string,
): LocationCity[] {
  const needle = provinceIdOrName.trim().toLowerCase();
  if (!needle) return [];
  const province = provinces.find(
    (p) =>
      p.id === needle ||
      p.name.toLowerCase() === needle ||
      p.id.toLowerCase() === needle,
  );
  if (!province) return [];
  return [...province.cities].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

export function findProvinceByName(name: string | null | undefined): LocationProvince | null {
  if (!name?.trim()) return null;
  const needle = name.trim().toLowerCase();
  return (
    provinces.find((p) => p.name.toLowerCase() === needle) ?? null
  );
}
