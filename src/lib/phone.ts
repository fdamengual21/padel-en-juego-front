export const DEFAULT_PHONE_DIAL = "54";

export interface PhoneDialOption {
  iso: string;
  dial: string;
  label: string;
}

/** Prefijos de UI. El valor persistido es un solo E.164. */
export const PHONE_DIAL_CODES: readonly PhoneDialOption[] = [
  { iso: "AR", dial: "54", label: "Argentina (+54)" },
  { iso: "UY", dial: "598", label: "Uruguay (+598)" },
  { iso: "CL", dial: "56", label: "Chile (+56)" },
  { iso: "PY", dial: "595", label: "Paraguay (+595)" },
  { iso: "BR", dial: "55", label: "Brasil (+55)" },
  { iso: "BO", dial: "591", label: "Bolivia (+591)" },
  { iso: "PE", dial: "51", label: "Perú (+51)" },
  { iso: "CO", dial: "57", label: "Colombia (+57)" },
  { iso: "MX", dial: "52", label: "México (+52)" },
  { iso: "ES", dial: "34", label: "España (+34)" },
  { iso: "US", dial: "1", label: "EE.UU. / Canadá (+1)" },
];

const ARGENTINA_DIAL = "54";

export function digitsOnly(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeArgentineNational(national: string): string {
  let next = national;
  if (next.startsWith(ARGENTINA_DIAL) && next.length > ARGENTINA_DIAL.length) {
    next = next.slice(ARGENTINA_DIAL.length);
  }
  next = next.replace(/^0+/, "");
  if (!next) return next;
  if (!next.startsWith("9")) next = `9${next}`;
  return next;
}

/** Une código de país + nacional en E.164. Vacío si no hay número nacional. */
export function combinePhone(
  dialCode: string | null | undefined,
  national: string | null | undefined,
): string {
  const nationalDigits = digitsOnly(national);
  if (!nationalDigits) return "";
  const country = digitsOnly(dialCode);
  const nationalNormalized =
    country === ARGENTINA_DIAL
      ? normalizeArgentineNational(nationalDigits)
      : nationalDigits;
  return country ? `+${country}${nationalNormalized}` : `+${nationalNormalized}`;
}

export function splitE164(e164: string | null | undefined): {
  dialCode: string;
  national: string;
} {
  const digits = digitsOnly(e164);
  if (!digits) return { dialCode: DEFAULT_PHONE_DIAL, national: "" };
  const sorted = [...PHONE_DIAL_CODES].sort(
    (a, b) => b.dial.length - a.dial.length,
  );
  const match = sorted.find((item) => digits.startsWith(item.dial));
  if (!match) return { dialCode: DEFAULT_PHONE_DIAL, national: digits };
  return { dialCode: match.dial, national: digits.slice(match.dial.length) };
}

export function isValidOptionalPhone(
  dialCode: string | null | undefined,
  national: string | null | undefined,
): boolean {
  const e164 = combinePhone(dialCode, national);
  if (!e164) return true;
  const digits = digitsOnly(e164);
  return digits.length >= 8 && digits.length <= 15;
}
