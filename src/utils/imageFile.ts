const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const IMAGE_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

export function imageFileError(file: File): string | null {
  const allowed =
    ALLOWED_IMAGE_TYPES.includes(file.type) ||
    (!file.type && /\.(jpe?g|png|webp|gif)$/i.test(file.name));
  if (!allowed) {
    return "Formato no permitido. Usá JPG, PNG, WEBP o GIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "La imagen no puede superar 5 MB.";
  }
  return null;
}
