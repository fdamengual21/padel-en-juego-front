import { useMockSession } from "@/app/MockSessionProvider";
import RequirePlayerAuth from "@/components/auth/RequirePlayerAuth";
import { ROUTES } from "@/router/routes";
import { PlayerProfileView } from "@/screens/users/components/PlayerProfile";

export default function UserProfileScreen() {
  const { userId, hasApiSession } = useMockSession();

  return (
    <div className="space-y-4 p-4 pb-10 md:p-0 md:pb-10" data-testid="player-profile">
      <RequirePlayerAuth nextPath={ROUTES.player.profile} actionLabel="Ver tu perfil">
        {userId ? (
          <PlayerProfileView key={userId} userId={userId} isOwner={hasApiSession} />
        ) : null}
      </RequirePlayerAuth>
    </div>
  );
}
