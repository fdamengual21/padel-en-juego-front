import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import ClubShell from "@/layout/ClubShell";
import UserShell from "@/layout/UserShell";
import EntryScreen from "@/screens/entry/EntryScreen";
import ClubDashboardScreen from "@/screens/club/ClubDashboardScreen";
import ClubTournamentsScreen from "@/screens/club/ClubTournamentsScreen";
import ClubTournamentCreateScreen from "@/screens/club/ClubTournamentCreateScreen";
import ClubTournamentDetailScreen from "@/screens/club/ClubTournamentDetailScreen";
import ClubClientsScreen from "@/screens/club/ClubClientsScreen";
import ClubClientDetailScreen from "@/screens/club/ClubClientDetailScreen";
import ClubCourtsScreen from "@/screens/club/ClubCourtsScreen";
import ClubScheduleScreen from "@/screens/club/ClubScheduleScreen";
import UserHomeScreen from "@/screens/users/UserHomeScreen";
import UserTournamentsScreen from "@/screens/users/UserTournamentsScreen";
import UserTournamentDetailScreen from "@/screens/users/UserTournamentDetailScreen";
import UserRankingScreen from "@/screens/users/UserRankingScreen";
import UserHistoryScreen from "@/screens/users/UserHistoryScreen";
import UserProfileScreen from "@/screens/users/UserProfileScreen";
import { ROUTES } from "@/router/routes";

function RootLayout() {
  return <Outlet />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path={ROUTES.home} element={<EntryScreen />} />

      <Route path={ROUTES.player.root} element={<UserShell />}>
        <Route index element={<UserHomeScreen />} />
        <Route path="torneos" element={<UserTournamentsScreen />} />
        <Route path="torneos/:tournamentId" element={<UserTournamentDetailScreen />} />
        <Route path="ranking" element={<UserRankingScreen />} />
        <Route path="historial" element={<UserHistoryScreen />} />
        <Route path="perfil" element={<UserProfileScreen />} />
      </Route>

      <Route path={ROUTES.club.root} element={<ClubShell />}>
        <Route index element={<ClubDashboardScreen />} />
        <Route path="torneos" element={<ClubTournamentsScreen />} />
        <Route path="torneos/nuevo" element={<ClubTournamentCreateScreen />} />
        <Route path="torneos/:tournamentId" element={<ClubTournamentDetailScreen />} />
        <Route path="clientes" element={<ClubClientsScreen />} />
        <Route path="clientes/:clientId" element={<ClubClientDetailScreen />} />
        <Route path="jugadores" element={<Navigate to={ROUTES.club.clients} replace />} />
        <Route path="canchas" element={<ClubCourtsScreen />} />
        <Route path="agenda" element={<ClubScheduleScreen />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Route>,
  ),
);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
