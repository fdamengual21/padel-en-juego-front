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
import LoginScreen from "@/screens/entry/LoginScreen";
import RegisterScreen from "@/screens/entry/RegisterScreen";
import CheckEmailScreen from "@/screens/entry/CheckEmailScreen";
import VerifyEmailScreen from "@/screens/entry/VerifyEmailScreen";
import PrivacyPolicyScreen from "@/screens/entry/PrivacyPolicyScreen";
import TermsOfServiceScreen from "@/screens/entry/TermsOfServiceScreen";
import ClubDashboardScreen from "@/screens/club/ClubDashboardScreen";
import ClubTournamentsScreen from "@/screens/club/ClubTournamentsScreen";
import ClubTournamentCreateScreen from "@/screens/club/ClubTournamentCreateScreen";
import ClubTournamentDetailScreen from "@/screens/club/ClubTournamentDetailScreen";
import ClubClientsScreen from "@/screens/club/ClubClientsScreen";
import ClubClientDetailScreen from "@/screens/club/ClubClientDetailScreen";
import ClubCourtsScreen from "@/screens/club/ClubCourtsScreen";
import ClubSettingsScreen from "@/screens/club/ClubSettingsScreen";
import UserHomeScreen from "@/screens/users/UserHomeScreen";
import UserClubsScreen from "@/screens/users/UserClubsScreen";
import UserTournamentsScreen from "@/screens/users/UserTournamentsScreen";
import UserTournamentDetailScreen from "@/screens/users/UserTournamentDetailScreen";
import UserRankingScreen from "@/screens/users/UserRankingScreen";
import UserHistoryScreen from "@/screens/users/UserHistoryScreen";
import UserProfileScreen from "@/screens/users/UserProfileScreen";
import RequireFeature from "@/router/guards/RequireFeature";
import RequireAuth from "@/router/guards/RequireAuth";
import RequireClubContext from "@/router/guards/RequireClubContext";
import RequirePermission from "@/router/guards/RequirePermission";
import LegacyPlayerRedirect from "@/router/LegacyPlayerRedirect";
import {
  PERMISSION_CLUB_COURTS_READ,
  PERMISSION_CLUB_SETTINGS_READ,
  PERMISSION_CLUB_TOURNAMENTS_READ,
  PERMISSION_CLUB_TOURNAMENTS_WRITE,
} from "@/authorization/permissionCodes";
import { ROUTES } from "@/router/routes";

function RootLayout() {
  return <Outlet />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path={ROUTES.auth.login} element={<LoginScreen />} />
      <Route path={ROUTES.auth.register} element={<RegisterScreen />} />
      <Route path={ROUTES.auth.checkEmail} element={<CheckEmailScreen />} />
      <Route path={ROUTES.auth.verifyEmail} element={<VerifyEmailScreen />} />
      <Route path={ROUTES.legal.privacy} element={<PrivacyPolicyScreen />} />
      <Route path={ROUTES.legal.terms} element={<TermsOfServiceScreen />} />
      <Route path={ROUTES.chooseMode} element={<EntryScreen />} />
      <Route path="player">
        <Route index element={<Navigate to={ROUTES.home} replace />} />
        <Route path="*" element={<LegacyPlayerRedirect />} />
      </Route>

      <Route element={<UserShell />}>
        <Route
          element={
            <RequireFeature
              feature="home"
              redirectTo={ROUTES.player.tournaments}
            />
          }
        >
          <Route index element={<UserHomeScreen />} />
        </Route>
        <Route
          element={<RequireFeature feature="clubs" redirectTo={ROUTES.home} />}
        >
          <Route path="clubes" element={<UserClubsScreen />} />
        </Route>
        <Route
          element={
            <RequireFeature feature="tournaments" redirectTo={ROUTES.home} />
          }
        >
          <Route path="torneos" element={<UserTournamentsScreen />} />
          <Route
            path="torneos/:tournamentId"
            element={<UserTournamentDetailScreen />}
          />
        </Route>
        <Route
          element={<RequireFeature feature="ranking" redirectTo={ROUTES.home} />}
        >
          <Route path="ranking" element={<UserRankingScreen />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route
            element={
              <RequireFeature feature="history" redirectTo={ROUTES.home} />
            }
          >
            <Route path="historial" element={<UserHistoryScreen />} />
          </Route>
        </Route>
        <Route
          element={<RequireFeature feature="profile" redirectTo={ROUTES.home} />}
        >
          <Route path="perfil" element={<UserProfileScreen />} />
        </Route>
      </Route>

      <Route path={ROUTES.club.root} element={<RequireClubContext />}>
        <Route element={<ClubShell />}>
        <Route
          element={
            <RequireFeature feature="clubDashboard" redirectTo={ROUTES.home} />
          }
        >
          <Route index element={<ClubDashboardScreen />} />
        </Route>
        <Route
          element={
            <RequireFeature
              feature="tournaments"
              redirectTo={ROUTES.club.dashboard}
            />
          }
        >
          <Route
            element={
              <RequirePermission permission={PERMISSION_CLUB_TOURNAMENTS_READ} />
            }
          >
            <Route path="torneos" element={<ClubTournamentsScreen />} />
            <Route
              path="torneos/:tournamentId"
              element={<ClubTournamentDetailScreen />}
            />
          </Route>
          <Route
            element={
              <RequirePermission permission={PERMISSION_CLUB_TOURNAMENTS_WRITE} />
            }
          >
            <Route path="torneos/nuevo" element={<ClubTournamentCreateScreen />} />
          </Route>
        </Route>
        <Route
          element={
            <RequireFeature feature="clients" redirectTo={ROUTES.club.dashboard} />
          }
        >
          <Route path="clientes" element={<ClubClientsScreen />} />
          <Route
            path="clientes/:clientId"
            element={<ClubClientDetailScreen />}
          />
        </Route>
        <Route path="jugadores" element={<Navigate to={ROUTES.club.clients} replace />} />
        <Route
          element={
            <RequireFeature feature="courts" redirectTo={ROUTES.club.dashboard} />
          }
        >
          <Route
            element={
              <RequirePermission permission={PERMISSION_CLUB_COURTS_READ} />
            }
          >
            <Route path="canchas" element={<ClubCourtsScreen />} />
          </Route>
        </Route>
        <Route
          element={
            <RequireFeature
              feature="clubSettings"
              redirectTo={ROUTES.club.dashboard}
            />
          }
        >
          <Route
            element={
              <RequirePermission permission={PERMISSION_CLUB_SETTINGS_READ} />
            }
          >
            <Route path="configuracion" element={<ClubSettingsScreen />} />
          </Route>
        </Route>
        <Route path="agenda" element={<Navigate to={ROUTES.club.courts} replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Route>,
  ),
);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
