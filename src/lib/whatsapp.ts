/** Dígitos para wa.me; null si no hay un teléfono usable. */
export function whatsappDigits(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

export function whatsappUrl(phone: string | null | undefined): string | null {
  const digits = whatsappDigits(phone);
  return digits ? `https://wa.me/${digits}` : null;
}
