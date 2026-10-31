import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { findUserClub } from "@/modules/auth/clubContext";
import { useAuthSessionGate } from "@/router/guards/useAuthSessionGate";
import { ROUTES } from "@/router/routes";

/** Backoffice: exige staff, club elegido y membresía vigente en `/me`. */
export default function RequireClubContext() {
  const { isChecking } = useAuthSessionGate();
  const location = useLocation();
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

  if (isChecking) {
    return null;
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`${ROUTES.auth.login}?next=${encodeURIComponent(next)}`}
        replace
      />
    );
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
