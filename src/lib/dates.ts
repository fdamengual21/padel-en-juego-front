import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";

dayjs.extend(utc);
dayjs.locale("es");

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Día de publicación legal (fecha calendario UTC): "Martes 1 de Septiembre 2026" */
export function formatPublishedDateEs(isoDate: string): string {
  const d = dayjs.utc(isoDate);
  if (!d.isValid()) return isoDate;
  const weekday = capitalizeWord(d.format("dddd"));
  const month = capitalizeWord(d.format("MMMM"));
  return `${weekday} ${d.format("D")} de ${month} ${d.format("YYYY")}`;
}

/** Ejemplo: "Jueves 10 de Septiembre 2026" */
export function formatLongDateEs(isoDate: string): string {
  const d = dayjs(isoDate);
  if (!d.isValid()) return isoDate;
  const weekday = capitalizeWord(d.format("dddd"));
  const month = capitalizeWord(d.format("MMMM"));
  return `${weekday} ${d.format("D")} de ${month} ${d.format("YYYY")}`;
}

/**
 * Horario de partido/agenda (hora de pared guardada con sufijo Z).
 * Ejemplo: "Domingo 19 15:00hs"
 */
export function formatScheduleShortEs(isoDate: string | null | undefined): string {
  if (!isoDate) return "Sin horario";
  const d = dayjs.utc(isoDate);
  if (!d.isValid()) return "Sin horario";
  return `${capitalizeWord(d.format("dddd"))} ${d.format("D")} ${d.format("HH:mm")}hs`;
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

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parsea `yyyy-MM-dd` como fecha local (sin corrimiento UTC). */
export function parseIsoDateOnly(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const match = ISO_DATE_ONLY.exec(iso.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

/** Serializa una fecha local a `yyyy-MM-dd`. */
export function toIsoDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Fecha compacta para el trigger del datepicker: "17 de Enero 1999". */
export function formatIsoDateOnlyEs(iso: string | null | undefined): string {
  const date = parseIsoDateOnly(iso);
  if (!date) return "";
  const month = capitalizeWord(dayjs(date).format("MMMM"));
  return `${date.getDate()} de ${month} ${date.getFullYear()}`;
}
