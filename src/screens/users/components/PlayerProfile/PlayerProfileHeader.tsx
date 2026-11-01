import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Settings, Share2 } from "lucide-react";
import Api from "@/api/Api";
import AvatarField from "@/components/AvatarField";
import CoverField from "@/components/CoverField";
import PhoneWhatsApp from "@/components/PhoneWhatsApp";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  formatCategoryLevel,
  playerSidePreferenceLabel,
  type PublicPlayerProfile,
} from "@/domain";
import { formatLocationEs } from "@/lib/dates";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/router/routes";
import { useAuthStore } from "@/stores/authStore";

interface PlayerProfileHeaderProps {
  data: PublicPlayerProfile;
  isOwner: boolean;
}

const chipClass =
  "inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-white/85";

const darkButtonClass =
  "border border-white/15 bg-white/10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sm:border-0 sm:bg-sidebar sm:hover:bg-sidebar-accent";

async function shareProfile(name: string, userId: string) {
  const url = `${window.location.origin}${ROUTES.player.playerProfile(userId)}`;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: name, url });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toastError("No se pudo compartir el perfil");
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toastSuccess("Link del perfil copiado");
  } catch {
    toastError("No se pudo copiar el link");
  }
}

export default function PlayerProfileHeader({ data, isOwner }: PlayerProfileHeaderProps) {
  const { player } = data;
  const queryClient = useQueryClient();
  const setUserProfile = useAuthStore((state) => state.setUserProfile);
  const location = formatLocationEs(data.city, data.province);
  const side = playerSidePreferenceLabel(player.sidePreference);

  const uploadMutation = useMutation({
    mutationFn: ({ kind, file }: { kind: "avatar" | "cover"; file: File }) =>
      kind === "avatar"
        ? Api.UserService().uploadAvatar(file)
        : Api.UserService().uploadCover(file),
    onSuccess: (updated, variables) => {
      setUserProfile(updated);
      void queryClient.invalidateQueries({
        queryKey: ["public-player-profile", player.userId],
      });
      toastSuccess(variables.kind === "avatar" ? "Foto de perfil actualizada" : "Portada actualizada");
    },
    onError: (err: Error) => toastError("No se pudo guardar", err.message),
  });

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-sidebar sm:bg-muted"
      data-testid="player-profile-header"
    >
      <div className="relative sm:min-h-60">
        <div className="relative h-36 sm:absolute sm:inset-0 sm:h-auto">
          <CoverField
            imageUrl={player.coverUrl}
            fallbackName={player.displayName}
            canEdit={isOwner}
            isSaving={uploadMutation.isPending}
            title="Portada"
            testId="player-cover-open"
            onSave={(file) => uploadMutation.mutateAsync({ kind: "cover", file })}
          />
        </div>
        <div className="pointer-events-none relative z-10 -mt-12 flex flex-col items-center gap-4 px-4 pb-5 text-center sm:mt-0 sm:flex-row sm:items-end sm:p-5 sm:pt-24 sm:text-left">
          <AvatarField
            name={player.displayName}
            imageUrl={player.avatarUrl}
            canEdit={isOwner}
            isSaving={uploadMutation.isPending}
            title="Foto de perfil"
            testId="player-avatar-open"
            shape="rounded"
            className="pointer-events-auto"
            avatarClassName="size-24 text-2xl shadow-2xl sm:size-26"
            onSave={(file) => uploadMutation.mutateAsync({ kind: "avatar", file })}
          />
          <div className="w-full min-w-0 flex-1 space-y-3 pb-0.5 text-white sm:w-auto sm:space-y-1.5">
            <div className="flex min-w-0 flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="min-w-0 max-w-full truncate text-2xl font-semibold tracking-tight">
                {player.displayName}
              </h2>
              {player.categoryLevel ? (
                <p className="inline-flex shrink-0 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  Categoría {formatCategoryLevel(player.categoryLevel)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-white/85 sm:justify-start">
              {location ? (
                <span className="inline-flex basis-full items-center justify-center gap-1 sm:basis-auto">
                  <MapPin className="size-3.5 text-primary" aria-hidden />
                  {location}
                </span>
              ) : null}
              {player.phone ? (
                <span className={chipClass}>
                  <PhoneWhatsApp phone={player.phone} className="pointer-events-auto text-white" />
                </span>
              ) : null}
              {side ? (
                <span className={chipClass}>
                  <span className="font-semibold text-white">Lado:</span> {side}
                </span>
              ) : null}
              <div className="pointer-events-auto mt-2 flex basis-full justify-center gap-2 sm:mt-0 sm:ml-auto sm:basis-auto">
                <Button
                  type="button"
                  size="icon-lg"
                  className={darkButtonClass}
                  aria-label="Compartir perfil"
                  title="Compartir perfil"
                  onClick={() => void shareProfile(player.displayName, player.userId)}
                >
                  <Share2 className="size-5" />
                </Button>
                {isOwner ? (
                  <Link
                    to={ROUTES.player.account}
                    className={cn(buttonVariants({ size: "icon-lg" }), darkButtonClass)}
                    aria-label="Editar mi cuenta"
                    title="Editar mi cuenta"
                    data-testid="player-profile-settings"
                  >
                    <Settings className="size-5" />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
