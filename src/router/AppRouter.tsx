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
import ClubSettingsScreen from "@/screens/club/ClubSettingsScreen";
import UserHomeScreen from "@/screens/users/UserHomeScreen";
import UserTournamentsScreen from "@/screens/users/UserTournamentsScreen";
import UserTournamentDetailScreen from "@/screens/users/UserTournamentDetailScreen";
import UserRankingScreen from "@/screens/users/UserRankingScreen";
import UserHistoryScreen from "@/screens/users/UserHistoryScreen";
import UserProfileScreen from "@/screens/users/UserProfileScreen";
import RequireFeature from "@/router/guards/RequireFeature";
import { ROUTES } from "@/router/routes";

function RootLayout() {
  return <Outlet />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path={ROUTES.home} element={<EntryScreen />} />

      <Route path={ROUTES.player.root} element={<UserShell />}>
        <Route element={<RequireFeature feature="home" redirectTo={ROUTES.home} />}>
          <Route index element={<UserHomeScreen />} />
        </Route>
        <Route
          element={
            <RequireFeature feature="tournaments" redirectTo={ROUTES.player.home} />
          }
        >
          <Route path="torneos" element={<UserTournamentsScreen />} />
          <Route path="torneos/:tournamentId" element={<UserTournamentDetailScreen />} />
        </Route>
        <Route
          element={<RequireFeature feature="ranking" redirectTo={ROUTES.player.home} />}
        >
          <Route path="ranking" element={<UserRankingScreen />} />
        </Route>
        <Route
          element={<RequireFeature feature="history" redirectTo={ROUTES.player.home} />}
        >
          <Route path="historial" element={<UserHistoryScreen />} />
        </Route>
        <Route
          element={<RequireFeature feature="profile" redirectTo={ROUTES.player.home} />}
        >
          <Route path="perfil" element={<UserProfileScreen />} />
        </Route>
      </Route>

      <Route path={ROUTES.club.root} element={<ClubShell />}>
        <Route
          element={
            <RequireFeature feature="clubDashboard" redirectTo={ROUTES.home} />
          }
        >
          <Route index element={<ClubDashboardScreen />} />
        </Route>
        <Route
          element={
            <RequireFeature feature="tournaments" redirectTo={ROUTES.club.dashboard} />
          }
        >
          <Route path="torneos" element={<ClubTournamentsScreen />} />
          <Route path="torneos/nuevo" element={<ClubTournamentCreateScreen />} />
          <Route path="torneos/:tournamentId" element={<ClubTournamentDetailScreen />} />
        </Route>
        <Route
          element={<RequireFeature feature="clients" redirectTo={ROUTES.club.dashboard} />}
        >
          <Route path="clientes" element={<ClubClientsScreen />} />
          <Route path="clientes/:clientId" element={<ClubClientDetailScreen />} />
        </Route>
        <Route path="jugadores" element={<Navigate to={ROUTES.club.clients} replace />} />
        <Route
          element={<RequireFeature feature="courts" redirectTo={ROUTES.club.dashboard} />}
        >
          <Route path="canchas" element={<ClubCourtsScreen />} />
        </Route>
        <Route
          element={
            <RequireFeature feature="clubSettings" redirectTo={ROUTES.club.dashboard} />
          }
        >
          <Route path="configuracion" element={<ClubSettingsScreen />} />
        </Route>
        <Route path="agenda" element={<Navigate to={ROUTES.club.courts} replace />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Route>,
  ),
);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
