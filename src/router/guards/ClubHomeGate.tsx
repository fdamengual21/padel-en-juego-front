import { Navigate } from "react-router-dom";
import { useUser } from "@/app/UserProvider";
import { PERMISSION_CLUB_RESERVATIONS_READ, usePermissions } from "@/authorization";
import ClubDashboardScreen from "@/screens/club/ClubDashboardScreen";
import { clubHome } from "@/router/clubHome";

/** Inicio si puede ver reservas; si no, la primera sección a la que sí entra. */
export default function ClubHomeGate() {
  const { isResolvingUser } = useUser();
  const { can } = usePermissions();

  if (isResolvingUser) return null;
  if (can(PERMISSION_CLUB_RESERVATIONS_READ)) {
    return <ClubDashboardScreen />;
  }
  return <Navigate to={clubHome(can)} replace />;
}
