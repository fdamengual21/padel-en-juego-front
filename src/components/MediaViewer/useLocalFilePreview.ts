import { useEffect, useState } from "react";

/**
 * Preview URL for a local `File` (object URL).
 * Revokes on unmount or when the file changes.
 */
export function useLocalFilePreview(file: File | undefined): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return previewUrl;
}
