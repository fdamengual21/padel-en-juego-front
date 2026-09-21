import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import {
  formatCategoryLevel,
  type Player,
  type PlayerDashboard,
} from "@/domain";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import AvatarField from "@/components/AvatarField";
import CoverField from "@/components/CoverField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatLocationEs } from "@/lib/dates";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

interface PlayerHomeHeaderProps {
  data: PlayerDashboard;
}

export default function PlayerHomeHeader({ data }: PlayerHomeHeaderProps) {
  const queryClient = useQueryClient();
  const { loginSession, user, hasApiSession } = useMockSession();
  const setUserProfile = useAuthStore((state) => state.setUserProfile);
  const [pickerOpen, setPickerOpen] = useState(false);
  const player = data.player;
  const location = formatLocationEs(data.city, data.province);
  const coverUrl = player.coverUrl;

  const { data: coverOptions = [] } = useQuery({
    queryKey: ["player-cover-images"],
    queryFn: () => Api.TournamentOpsService().listPlayerCoverImages(),
    enabled: !hasApiSession,
  });

  const coverMutation = useMutation({
    mutationFn: (nextCover: string) =>
      Api.TournamentOpsService().updatePlayer(player.id, {
        coverUrl: nextCover,
      }),
    onSuccess: (updated: Player) => {
      void queryClient.invalidateQueries({ queryKey: ["player-home", player.id] });
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      if (user) {
        loginSession({ user, player: updated });
      }
      setPickerOpen(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ kind, file }: { kind: "avatar" | "cover"; file: File }) =>
      kind === "avatar"
        ? Api.UserService().uploadAvatar(file)
        : Api.UserService().uploadCover(file),
    onSuccess: (updated, variables) => {
      setUserProfile(updated);
      toastSuccess(
        variables.kind === "avatar"
          ? "Foto de perfil actualizada"
          : "Portada actualizada",
      );
    },
    onError: (err: Error) => {
      toastError("No se pudo guardar", err.message);
    },
  });

  return (
    <>
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-muted"
        data-testid="player-home-header"
      >
        <div className="relative min-h-44 sm:min-h-52">
          <CoverField
            imageUrl={coverUrl}
            fallbackName={player.displayName}
            canEdit={hasApiSession}
            isSaving={uploadMutation.isPending}
            title="Portada"
            testId="player-cover-open"
            onSave={(file) =>
              uploadMutation.mutateAsync({ kind: "cover", file })
            }
          />

          {hasApiSession ? null : (
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute right-3 top-3 z-10 border-0 bg-black/45 text-white hover:bg-black/60"
              aria-label="Cambiar imagen de portada"
              onClick={() => setPickerOpen(true)}
            >
              <Camera className="size-4" />
            </Button>
          )}

          <div className="pointer-events-none relative z-10 flex items-end gap-4 p-4 pt-16 sm:p-5 sm:pt-20">
            <AvatarField
              name={player.displayName}
              imageUrl={player.avatarUrl}
              canEdit={hasApiSession}
              isSaving={uploadMutation.isPending}
              title="Foto de perfil"
              testId="player-avatar-open"
              className="pointer-events-auto"
              onSave={(file) =>
                uploadMutation.mutateAsync({ kind: "avatar", file })
              }
            />
            <div className="min-w-0 flex-1 pb-0.5 text-white">
              <p className="mb-1 inline-flex rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                Categoría {formatCategoryLevel(player.categoryLevel)}
              </p>
              <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                {player.displayName}
              </h2>
              {location ? (
                <p className="mt-0.5 text-sm text-white/80">{location}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Elegir portada</DialogTitle>
            <DialogDescription>
              Elegí una imagen de ejemplo. Se guarda en tu perfil (almacenamiento
              local).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {coverOptions.map((path) => {
              const selected = coverUrl === path;
              return (
                <button
                  key={path}
                  type="button"
                  disabled={coverMutation.isPending}
                  onClick={() => coverMutation.mutate(path)}
                  className={cn(
                    "relative aspect-[16/10] overflow-hidden rounded-xl border-2 transition-colors",
                    selected
                      ? "border-primary"
                      : "border-transparent hover:border-border",
                  )}
                >
                  <img
                    src={path}
                    alt=""
                    className="size-full object-cover"
                  />
                  {selected ? (
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Actual
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
