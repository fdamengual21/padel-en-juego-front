import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { useUser } from "@/app/UserProvider";
import { findUserClub } from "@/modules/auth/clubContext";
import { ROUTES } from "@/router/routes";

/** Backoffice: exige staff, club elegido y membresía vigente en `/me`. */
export default function RequireClubContext() {
  const { isResolvingUser } = useUser();
  const {
    isAuthenticated,
    hasAssociatedClub,
    clubs,
    selectedClubId,
    isClubMode,
    enterClub,
  } = useMockSession();
  const membership = findUserClub(clubs, selectedClubId);

  useEffect(() => {
    if (membership && !isClubMode) {
      enterClub(membership.id);
    }
  }, [enterClub, isClubMode, membership]);

  if (isResolvingUser) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.auth.login} replace />;
  }

  if (!hasAssociatedClub) {
    return <Navigate to={ROUTES.home} replace />;
  }

  if (!membership) {
    return <Navigate to={ROUTES.chooseMode} replace />;
  }

  if (!isClubMode) {
    return null;
  }

  return <Outlet />;
}
