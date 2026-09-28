export function formatArs(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Sin precio";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
