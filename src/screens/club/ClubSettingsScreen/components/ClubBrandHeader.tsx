import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Api from "@/api/Api";
import Avatar from "@/components/Avatar";
import ImageViewerDialog, {
  type ImageViewerMode,
} from "@/components/ImageViewerDialog";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ClubSettings } from "@/modules/clubs";
import { useAuthStore } from "@/stores/authStore";

interface ClubBrandHeaderProps {
  club: ClubSettings;
  canEdit: boolean;
}

export default function ClubBrandHeader({ club, canEdit }: ClubBrandHeaderProps) {
  const queryClient = useQueryClient();
  const setUserProfile = useAuthStore((state) => state.setUserProfile);
  const [viewer, setViewer] = useState<ImageViewerMode | null>(null);

  const persistClub = async (updated: ClubSettings) => {
    queryClient.setQueryData(["club-settings", updated.id], updated);
    try {
      const me = await Api.UserService().me();
      setUserProfile(me);
    } catch {
      /* El sidebar ya lee club-settings */
    }
  };

  const uploadMutation = useMutation({
    mutationFn: ({ kind, file }: { kind: ImageViewerMode; file: File }) =>
      kind === "avatar"
        ? Api.ClubService().uploadAvatar(file)
        : Api.ClubService().uploadCover(file),
    onSuccess: async (updated, variables) => {
      await persistClub(updated);
      toastSuccess(
        variables.kind === "avatar" ? "Logo actualizado" : "Portada actualizada",
      );
    },
    onError: (err: Error) => {
      toastError("No se pudo guardar", err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (kind: ImageViewerMode) =>
      kind === "avatar"
        ? Api.ClubService().deleteAvatar()
        : Api.ClubService().deleteCover(),
    onSuccess: async (updated, kind) => {
      await persistClub(updated);
      toastSuccess(kind === "avatar" ? "Logo quitado" : "Portada quitada");
    },
    onError: (err: Error) => {
      toastError("No se pudo quitar", err.message);
    },
  });

  const isSaving = uploadMutation.isPending || deleteMutation.isPending;
  const viewerTitle = viewer === "cover" ? "Portada" : "Logo del club";
  const viewerImageUrl = viewer === "cover" ? club.coverUrl : club.avatarUrl;

  return (
    <>
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-muted"
        data-testid="club-brand-header"
      >
        <div className="relative min-h-44 sm:min-h-52">
          <button
            type="button"
            className="absolute inset-0 z-0 cursor-pointer"
            aria-label="Ver portada"
            data-testid="club-cover-open"
            onClick={() => setViewer("cover")}
          >
            {club.coverUrl ? (
              <img
                src={club.coverUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            ) : null}
            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
          </button>

          <div className="pointer-events-none relative z-10 flex items-end gap-4 p-4 pt-16 sm:p-5 sm:pt-20">
            <button
              type="button"
              className="pointer-events-auto shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Ver logo del club"
              data-testid="club-avatar-open"
              onClick={() => setViewer("avatar")}
            >
              <Avatar
                name={club.name}
                imageUrl={club.avatarUrl}
                size="xl"
                alt={club.name}
                className="pointer-events-none ring-2 ring-white/80"
              />
            </button>
            <div className="min-w-0 flex-1 pb-0.5 text-white">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-white/75">
                Club
              </p>
              <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                {club.name || "Sin nombre"}
              </h2>
              <p className="mt-0.5 text-sm text-white/80">
                {canEdit
                  ? "Tocá la portada o el logo para cambiarlos"
                  : "Portada y logo del predio"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <ImageViewerDialog
        open={viewer !== null}
        onOpenChange={(open) => {
          if (!open) setViewer(null);
        }}
        mode={viewer ?? "avatar"}
        title={viewerTitle}
        imageUrl={viewerImageUrl}
        fallbackName={club.name}
        canEdit={canEdit}
        isSaving={isSaving}
        editAriaLabel={
          viewer === "cover" ? "Cambiar portada" : "Cambiar logo del club"
        }
        onSave={async (file) => {
          if (!viewer) return;
          await uploadMutation.mutateAsync({ kind: viewer, file });
        }}
        onDelete={
          canEdit
            ? async () => {
                if (!viewer) return;
                await deleteMutation.mutateAsync(viewer);
              }
            : undefined
        }
      />
    </>
  );
}
