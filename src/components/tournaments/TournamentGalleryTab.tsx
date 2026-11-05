import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Images, LoaderCircle, Plus, Trash2 } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import {
  MediaViewer,
  toMediaViewerItemsFromUrls,
  useMediaViewer,
  type MediaViewerItem,
} from "@/components/MediaViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WarningDialog from "@/components/ui/warning-dialog";
import {
  TOURNAMENT_GALLERY_MAX_PHOTOS,
  TOURNAMENT_PHOTO_DESCRIPTION_MAX,
  type TournamentPhoto,
} from "@/domain";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { IMAGE_FILE_ACCEPT, imageFileError } from "@/utils";

interface TournamentGalleryTabProps {
  tournamentId: string;
  /** Fotos ya conocidas (p. ej. página pública). Si `canManage`, se refrescan con GET club. */
  photos?: TournamentPhoto[];
  canManage?: boolean;
  enabled?: boolean;
}

interface GalleryDraft {
  id: string;
  file: File;
  previewUrl: string;
  description: string;
}

function revokeDrafts(drafts: GalleryDraft[]) {
  for (const draft of drafts) URL.revokeObjectURL(draft.previewUrl);
}

function normalizeDescription(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export default function TournamentGalleryTab({
  tournamentId,
  photos: initialPhotos = [],
  canManage = false,
  enabled = true,
}: TournamentGalleryTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<GalleryDraft[]>([]);
  const [descriptionEdits, setDescriptionEdits] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<TournamentPhoto | null>(null);
  const { open, items, initialIndex, openViewer, closeViewer } = useMediaViewer();

  const photosQuery = useQuery({
    queryKey: ["tournament", tournamentId, "photos"],
    queryFn: () => Api.TournamentService().listPhotos(tournamentId),
    enabled: enabled && canManage,
  });

  const photos = canManage ? (photosQuery.data ?? initialPhotos) : initialPhotos;
  const remainingSlots = Math.max(0, TOURNAMENT_GALLERY_MAX_PHOTOS - photos.length);
  const canAddMoreDrafts = drafts.length < remainingSlots;
  const showEmpty = photos.length === 0 && drafts.length === 0;
  const rulesLabel = `${photos.length}/${TOURNAMENT_GALLERY_MAX_PHOTOS} guardadas · JPG, PNG o WEBP`;

  useEffect(() => {
    return () => revokeDrafts(drafts);
    // Solo al desmontar: los previews vivos se revocan al quitar/guardar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photosSyncKey = photos
    .map((photo) => `${photo.id}:${photo.description ?? ""}`)
    .join("|");

  useEffect(() => {
    setDescriptionEdits({});
  }, [photosSyncKey]);

  const photoDescription = (photo: TournamentPhoto) =>
    descriptionEdits[photo.id] ?? photo.description ?? "";

  const dirtyDescriptions = photos.filter(
    (photo) =>
      normalizeDescription(photoDescription(photo)) !==
      normalizeDescription(photo.description),
  );
  const hasChanges = drafts.length > 0 || dirtyDescriptions.length > 0;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId, "photos"] });
    await queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let uploaded = 0;
      let updated = 0;

      for (const item of drafts) {
        await Api.TournamentService().uploadPhoto(
          tournamentId,
          item.file,
          normalizeDescription(item.description),
        );
        uploaded += 1;
      }

      for (const photo of dirtyDescriptions) {
        await Api.TournamentService().updatePhotoDescription(
          tournamentId,
          photo.id,
          normalizeDescription(photoDescription(photo)),
        );
        updated += 1;
      }

      return { uploaded, updated };
    },
    onSuccess: async ({ uploaded, updated }) => {
      revokeDrafts(drafts);
      setDrafts([]);
      setDescriptionEdits({});
      if (fileInputRef.current) fileInputRef.current.value = "";
      await invalidate();

      if (uploaded > 0 && updated > 0) {
        toastSuccess("Galería actualizada");
      } else if (uploaded > 0) {
        toastSuccess(
          uploaded === 1 ? "Foto agregada a la galería" : `${uploaded} fotos agregadas a la galería`,
        );
      } else {
        toastSuccess(
          updated === 1 ? "Descripción actualizada" : "Descripciones actualizadas",
        );
      }
    },
    onError: async (err: Error) => {
      await invalidate();
      toastError("No se pudo guardar la galería", err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => Api.TournamentService().deletePhoto(tournamentId, photoId),
    onSuccess: async () => {
      setPendingDelete(null);
      closeViewer();
      await invalidate();
      toastSuccess("Foto eliminada");
    },
    onError: (err: Error) => toastError("No se pudo eliminar la foto", err.message),
  });

  const photoViewerItems = useMemo(
    () =>
      toMediaViewerItemsFromUrls(
        photos.map((photo, index) => ({
          id: photo.id,
          url: photo.url,
          name: `Foto ${index + 1}`,
          description: normalizeDescription(photoDescription(photo)) ?? undefined,
          mimeType: "image/jpeg",
        })),
      ),
    // photoDescription depends on descriptionEdits + photos
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos, descriptionEdits],
  );

  const draftViewerItems = useMemo(
    () =>
      toMediaViewerItemsFromUrls(
        drafts.map((draft, index) => ({
          id: draft.id,
          url: draft.previewUrl,
          name: `Foto nueva ${index + 1}`,
          description: normalizeDescription(draft.description) ?? undefined,
          mimeType: draft.file.type || "image/jpeg",
        })),
      ),
    [drafts],
  );

  const manageViewerItems = useMemo(
    () => [...photoViewerItems, ...draftViewerItems],
    [photoViewerItems, draftViewerItems],
  );

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    const slotsLeft = remainingSlots - drafts.length;
    if (slotsLeft <= 0) {
      toastError(`Máximo ${TOURNAMENT_GALLERY_MAX_PHOTOS} fotos`);
      return;
    }

    const accepted: GalleryDraft[] = [];
    let rejected = 0;
    for (const file of selected) {
      if (accepted.length >= slotsLeft) break;
      const error = imageFileError(file);
      if (error) {
        rejected += 1;
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        description: "",
      });
    }

    if (accepted.length === 0) {
      toastError(
        rejected > 0
          ? "Ninguna imagen es válida. Usá JPG, PNG, WEBP o GIF de hasta 5 MB."
          : `Máximo ${TOURNAMENT_GALLERY_MAX_PHOTOS} fotos`,
      );
      return;
    }

    if (selected.length > slotsLeft || rejected > 0) {
      const skipped = selected.length - accepted.length;
      toastError(
        rejected > 0
          ? `Se agregaron ${accepted.length}. Algunas no eran válidas o no había más lugar (máx. ${TOURNAMENT_GALLERY_MAX_PHOTOS}).`
          : `Solo se agregaron ${accepted.length}, quedaron ${skipped} ${skipped === 1 ? "foto" : "fotos"} sin agregar`,
      );
    }

    setDrafts((prev) => [...prev, ...accepted]);
  };

  const updateDraftDescription = (id: string, description: string) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, description } : draft)),
    );
  };

  const updatePhotoDescriptionLocal = (id: string, description: string) => {
    setDescriptionEdits((prev) => ({ ...prev, [id]: description }));
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const next = prev.filter((draft) => draft.id !== id);
      const removed = prev.find((draft) => draft.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const openPublicViewer = (index: number) => {
    openViewer(photoViewerItems, index);
  };

  const openManageViewer = (index: number) => {
    openViewer(manageViewerItems, index);
  };

  const handleViewerDelete = (item: MediaViewerItem) => {
    const draft = drafts.find((entry) => entry.id === item.id);
    if (draft) {
      const remaining = manageViewerItems.length - 1;
      removeDraft(draft.id);
      if (remaining <= 0) closeViewer();
      return;
    }
    const photo = photos.find((entry) => entry.id === item.id);
    if (photo) setPendingDelete(photo);
  };

  if (canManage && photosQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Cargando galería…
      </p>
    );
  }

  const busy = saveMutation.isPending || deleteMutation.isPending;

  const addSlotButton = (
    <button
      type="button"
      disabled={busy || !canAddMoreDrafts}
      data-testid="tournament-gallery-add-slot"
      className={cn(
        "flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-border bg-muted/20 text-[11px] text-muted-foreground transition duration-150 hover:scale-[1.02] hover:border-primary/50 hover:bg-muted/50 hover:text-foreground active:scale-[0.98]",
        (busy || !canAddMoreDrafts) &&
          "cursor-not-allowed opacity-50 hover:scale-100 hover:border-border hover:bg-muted/20 hover:text-muted-foreground active:scale-100",
      )}
      onClick={openFilePicker}
    >
      <Plus className="size-4" />
      <span>Agregar</span>
    </button>
  );

  return (
    <div className="space-y-4 pt-4" data-testid="tournament-gallery-tab">
      {canManage ? (
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          multiple
          className="hidden"
          data-testid="tournament-gallery-file"
          onChange={handleFileChange}
        />
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={Images}
          title="Sin fotos todavía"
          description={
            canManage
              ? "Elegí hasta 5 fotos del torneo, agregales una descripción si querés y guardá."
              : "El club todavía no cargó fotos de este torneo."
          }
        >
          {canManage ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-muted-foreground">{rulesLabel}</p>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                data-testid="tournament-gallery-add"
                onClick={openFilePicker}
              >
                <ImagePlus />
                Elegir fotos
              </Button>
            </div>
          ) : null}
        </EmptyState>
      ) : null}

      {canManage && !showEmpty ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{rulesLabel}</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {photos.map((photo, index) => {
              const description = photoDescription(photo);
              const caption = normalizeDescription(description) ?? "Foto del torneo";
              return (
                <li
                  key={photo.id}
                  className="overflow-hidden rounded-md border border-border/70 bg-muted/20"
                  data-testid={`tournament-gallery-thumb-${photo.id}`}
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <button
                      type="button"
                      className="group size-full cursor-pointer"
                      aria-label={`Ampliar foto ${index + 1}`}
                      onClick={() => openManageViewer(index)}
                    >
                      <img
                        src={photo.url}
                        alt={caption}
                        className="size-full object-cover transition group-hover:scale-[1.02]"
                      />
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-1 top-1 size-7 bg-black/50 text-white hover:bg-black/70 hover:text-white"
                      aria-label="Eliminar foto"
                      disabled={busy}
                      onClick={() => setPendingDelete(photo)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1 p-1.5">
                    <Label htmlFor={`gallery-photo-desc-${photo.id}`} className="sr-only">
                      Descripción (opcional)
                    </Label>
                    <Input
                      id={`gallery-photo-desc-${photo.id}`}
                      value={description}
                      maxLength={TOURNAMENT_PHOTO_DESCRIPTION_MAX}
                      placeholder="Descripción (opc.)"
                      className="h-8 text-xs"
                      disabled={busy}
                      onChange={(event) =>
                        updatePhotoDescriptionLocal(photo.id, event.target.value)
                      }
                    />
                  </div>
                </li>
              );
            })}

            {drafts.map((draft, index) => (
              <li
                key={draft.id}
                className="overflow-hidden rounded-md border border-border/70 bg-muted/20"
                data-testid={`tournament-gallery-draft-${draft.id}`}
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <button
                    type="button"
                    className="group size-full cursor-pointer"
                    aria-label={`Ampliar foto nueva ${index + 1}`}
                    onClick={() => openManageViewer(photos.length + index)}
                  >
                    <img
                      src={draft.previewUrl}
                      alt={`Foto nueva ${index + 1}`}
                      className="size-full object-cover transition group-hover:scale-[1.02]"
                    />
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1 size-7 bg-black/50 text-white hover:bg-black/70 hover:text-white"
                    aria-label="Quitar de la selección"
                    disabled={busy}
                    onClick={() => removeDraft(draft.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="space-y-1 p-1.5">
                  <Label htmlFor={`gallery-draft-desc-${draft.id}`} className="sr-only">
                    Descripción (opcional)
                  </Label>
                  <Input
                    id={`gallery-draft-desc-${draft.id}`}
                    value={draft.description}
                    maxLength={TOURNAMENT_PHOTO_DESCRIPTION_MAX}
                    placeholder="Descripción (opc.)"
                    className="h-8 text-xs"
                    disabled={busy}
                    onChange={(event) =>
                      updateDraftDescription(draft.id, event.target.value)
                    }
                  />
                </div>
              </li>
            ))}

            {canAddMoreDrafts ? <li>{addSlotButton}</li> : null}
          </ul>

          {drafts.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {drafts.length === 1
                ? "Se va a agregar 1 foto"
                : `Se van a agregar ${drafts.length} fotos`}
            </p>
          ) : null}

          <Button
            type="button"
            size="sm"
            disabled={busy || !hasChanges}
            data-testid="tournament-gallery-save"
            onClick={() => void saveMutation.mutateAsync()}
          >
            {saveMutation.isPending ? (
              <>
                <LoaderCircle className="animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      ) : null}

      {!canManage && photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {photos.map((photo, index) => {
            const caption = normalizeDescription(photo.description) ?? "-";
            return (
              <li key={photo.id}>
                <button
                  type="button"
                  className="group w-full overflow-hidden rounded-md border border-border/70 bg-muted/30 text-left transition hover:border-border"
                  data-testid={`tournament-gallery-thumb-${photo.id}`}
                  onClick={() => openPublicViewer(index)}
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={photo.url}
                      alt={caption === "-" ? "Foto del torneo" : caption}
                      className="size-full object-cover transition group-hover:scale-[1.02]"
                    />
                  </div>
                  <p
                    className={cn(
                      "truncate border-t border-border/60 bg-background px-1.5 py-1.5 text-xs leading-tight",
                      caption === "-"
                        ? "font-normal text-muted-foreground"
                        : "font-medium text-foreground",
                    )}
                  >
                    {caption}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <MediaViewer
        open={open}
        items={items}
        initialIndex={initialIndex}
        onClose={closeViewer}
        allowDownload={!canManage}
        canDelete={canManage}
        isDeleting={deleteMutation.isPending}
        onDelete={handleViewerDelete}
        onDownloadError={(message) => toastError("No se pudo descargar", message)}
      />

      <WarningDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteMutation.isPending) setPendingDelete(null);
        }}
        title="Eliminar foto"
        description="La foto se quita de la galería del torneo. Esta acción no se deshace."
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        isConfirming={deleteMutation.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          void deleteMutation.mutateAsync(pendingDelete.id);
        }}
      />
    </div>
  );
}
