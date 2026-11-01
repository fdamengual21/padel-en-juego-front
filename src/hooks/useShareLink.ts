import { useQuery } from "@tanstack/react-query";
import { fetchShareImage, isMobileShare, shareOrCopy } from "@/lib/share";

interface UseShareLinkInput {
  title: string;
  /** Ruta pública (sin origin). */
  path: string;
  imageUrl?: string | null;
  copiedLabel: string;
}

/**
 * Compartir link (+ imagen en mobile). La imagen se baja al montar:
 * iOS exige llamar a `navigator.share` dentro del gesto, sin un fetch en el medio.
 */
export function useShareLink({ title, path, imageUrl, copiedLabel }: UseShareLinkInput) {
  const mobile = isMobileShare();
  const imageQuery = useQuery({
    queryKey: ["share-image", imageUrl],
    queryFn: () => fetchShareImage(imageUrl ?? "", title),
    enabled: mobile && Boolean(imageUrl),
    staleTime: Infinity,
    retry: false,
  });

  const share = () =>
    shareOrCopy({
      title,
      url: `${window.location.origin}${path}`,
      image: imageQuery.data,
      copiedLabel,
    });

  return { share };
}
