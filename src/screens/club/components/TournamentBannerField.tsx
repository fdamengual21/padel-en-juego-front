import { Trash2 } from "lucide-react";
import ImagePickerField from "@/components/ImagePickerField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface TournamentBannerFieldProps {
  bannerUrl?: string | null;
  file: File | null;
  remove: boolean;
  readOnly?: boolean;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

export default function TournamentBannerField({
  bannerUrl,
  file,
  remove,
  readOnly = false,
  onFileSelect,
  onRemove,
}: TournamentBannerFieldProps) {
  const shownUrl = file || remove ? null : bannerUrl;
  const canRemove = !readOnly && Boolean(file || shownUrl);

  return (
    <div className="space-y-2">
      <Label htmlFor="tournament-banner">Flyer del torneo</Label>
      <div className="relative max-w-xs">
        <ImagePickerField
          id="tournament-banner"
          imageUrl={shownUrl}
          file={file}
          canEdit={!readOnly}
          emptyLabel="Sin flyer"
          ariaLabel="Editar flyer del torneo"
          testId="tournament-banner-picker"
          mediaClassName="aspect-[3/4] max-h-80 w-full object-contain"
          onFileSelect={onFileSelect}
        />
        {canRemove ? (
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            className="absolute right-2 top-2 z-10"
            aria-label="Quitar flyer"
            data-testid="tournament-banner-remove"
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Afiche vertical (JPG, PNG o WEBP). Se muestra en el catálogo y en la ficha del torneo.
      </p>
    </div>
  );
}
