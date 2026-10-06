import { Navigate } from "react-router-dom";
import { useUser } from "@/app/UserProvider";
import {
  PERMISSION_CLUB_RESERVATIONS_READ,
  PERMISSION_CLUB_TOURNAMENTS_READ,
  usePermissions,
} from "@/authorization";
import ClubDashboardScreen from "@/screens/club/ClubDashboardScreen";
import { clubHome } from "@/router/clubHome";

/** Resumen si puede ver reservas o torneos; si no, la primera sección a la que sí entra. */
export default function ClubHomeGate() {
  const { isResolvingUser } = useUser();
  const { can } = usePermissions();

  if (isResolvingUser) return null;
  if (can(PERMISSION_CLUB_RESERVATIONS_READ) || can(PERMISSION_CLUB_TOURNAMENTS_READ)) {
    return <ClubDashboardScreen />;
  }
  return <Navigate to={clubHome(can)} replace />;
}
