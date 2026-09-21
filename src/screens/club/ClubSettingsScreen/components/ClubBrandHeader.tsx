import { useMutation, useQueryClient } from "@tanstack/react-query";
import Api from "@/api/Api";
import AvatarField from "@/components/AvatarField";
import CoverField from "@/components/CoverField";
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
    mutationFn: ({ kind, file }: { kind: "avatar" | "cover"; file: File }) =>
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
    mutationFn: (kind: "avatar" | "cover") =>
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

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-muted"
      data-testid="club-brand-header"
    >
      <div className="relative min-h-44 sm:min-h-52">
        <CoverField
          imageUrl={club.coverUrl}
          fallbackName={club.name}
          canEdit={canEdit}
          isSaving={isSaving}
          title="Portada"
          editAriaLabel="Cambiar portada"
          testId="club-cover-open"
          onSave={(file) => uploadMutation.mutateAsync({ kind: "cover", file })}
          onDelete={
            canEdit ? () => deleteMutation.mutateAsync("cover") : undefined
          }
        />

        <div className="pointer-events-none relative z-10 flex items-end gap-4 p-4 pt-16 sm:p-5 sm:pt-20">
          <AvatarField
            name={club.name}
            imageUrl={club.avatarUrl}
            canEdit={canEdit}
            isSaving={isSaving}
            title="Logo del club"
            ariaLabel={canEdit ? "Editar logo del club" : "Ver logo del club"}
            editAriaLabel="Cambiar logo del club"
            testId="club-avatar-open"
            className="pointer-events-auto"
            onSave={(file) =>
              uploadMutation.mutateAsync({ kind: "avatar", file })
            }
            onDelete={
              canEdit ? () => deleteMutation.mutateAsync("avatar") : undefined
            }
          />
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
  );
}
