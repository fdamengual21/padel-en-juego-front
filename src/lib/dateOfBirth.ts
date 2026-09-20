const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(iso: string): Date | null {
  const match = ISO_DATE.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Edad en años cumplidos a partir de `yyyy-MM-dd`. */
export function ageFromDateOfBirth(
  iso: string | null | undefined,
  today = new Date(),
): number | null {
  if (!iso) return null;
  const dob = parseIsoDate(iso);
  if (!dob) return null;
  const now = startOfLocalDay(today);
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function isValidOptionalDateOfBirth(
  iso: string | null | undefined,
  today = new Date(),
): boolean {
  if (!iso) return true;
  const dob = parseIsoDate(iso);
  if (!dob) return false;
  if (dob > startOfLocalDay(today)) return false;
  const age = ageFromDateOfBirth(iso, today);
  return age != null && age >= 12 && age <= 99;
}

