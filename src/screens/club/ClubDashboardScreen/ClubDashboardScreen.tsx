import { memo } from "react";
import { useMockSession } from "@/app/MockSessionProvider";
import {
  PERMISSION_CLUB_RESERVATIONS_READ,
  PERMISSION_CLUB_TOURNAMENTS_READ,
} from "@/authorization";
import { PermissionsGuard } from "@/components/guards";
import DashboardPageHeader from "./components/DashboardPageHeader";
import DashboardReservationsSection from "./components/DashboardReservationsSection";
import DashboardTournamentsSection from "./components/DashboardTournamentsSection";

const PageHeader = memo(DashboardPageHeader);

export default function ClubDashboardScreen() {
  const { player } = useMockSession();
  const firstName = player?.firstName ?? "";

  return (
    <div className="space-y-6" data-testid="club-dashboard">
      <PageHeader firstName={firstName} />
      <PermissionsGuard permission={PERMISSION_CLUB_RESERVATIONS_READ}>
        <DashboardReservationsSection />
      </PermissionsGuard>
      <PermissionsGuard permission={PERMISSION_CLUB_TOURNAMENTS_READ}>
        <DashboardTournamentsSection />
      </PermissionsGuard>
    </div>
  );
}
