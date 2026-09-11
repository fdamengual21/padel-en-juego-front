import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Ejemplo: "Jueves 10 de Septiembre 2026" */
export function formatLongDateEs(isoDate: string): string {
  const d = dayjs(isoDate);
  if (!d.isValid()) return isoDate;
  const weekday = capitalizeWord(d.format("dddd"));
  const month = capitalizeWord(d.format("MMMM"));
  return `${weekday} ${d.format("D")} de ${month} ${d.format("YYYY")}`;
}

/** Ejemplo: "Sábado 15:00" */
export function formatScheduleShortEs(isoDate: string | null | undefined): string {
  if (!isoDate) return "Sin horario";
  const d = dayjs(isoDate);
  if (!d.isValid()) return "Sin horario";
  return `${capitalizeWord(d.format("dddd"))} ${d.format("HH:mm")}`;
}

/** Día de torneo (fecha calendario): "Sábado 20 de Septiembre" */
export function formatTournamentDayEs(date: string | null | undefined): string {
  if (!date) return "Sin fecha";
  const d = dayjs(date);
  if (!d.isValid()) return "Sin fecha";
  const weekday = capitalizeWord(d.format("dddd"));
  const month = capitalizeWord(d.format("MMMM"));
  return `${weekday} ${d.format("D")} de ${month}`;
}

/** "Vicente López, Buenos Aires" */
export function formatLocationEs(
  city: string | null | undefined,
  province: string | null | undefined,
): string | null {
  const parts = [city, province].map((p) => p?.trim()).filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(", ") : null;
}
