import { useParams } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { PlayerProfileView } from "@/screens/users/components/PlayerProfile";

export default function PublicPlayerProfileScreen() {
  const { userId = "" } = useParams();
  const { userId: myUserId, hasApiSession } = useMockSession();
  const isOwner = hasApiSession && myUserId === userId;

  return (
    <div className="p-4 pb-10 md:p-0 md:pb-10" data-testid="public-player-profile">
      <PlayerProfileView key={userId} userId={userId} isOwner={isOwner} />
    </div>
  );
}
