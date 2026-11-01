import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShareLink } from "@/hooks/useShareLink";

interface ShareButtonProps {
  title: string;
  /** Ruta pública (sin origin). */
  path: string;
  imageUrl?: string | null;
  copiedLabel: string;
  className?: string;
  testId?: string;
}

/** Desktop: copia el link. Mobile: hoja nativa con imagen y link. */
export default function ShareButton({
  title,
  path,
  imageUrl,
  copiedLabel,
  className,
  testId,
}: ShareButtonProps) {
  const { share } = useShareLink({ title, path, imageUrl, copiedLabel });

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className}
      aria-label="Compartir"
      title="Compartir"
      data-testid={testId}
      onClick={() => void share()}
    >
      <Share2 className="size-4" />
      <span className="hidden sm:inline">Compartir</span>
    </Button>
  );
}
