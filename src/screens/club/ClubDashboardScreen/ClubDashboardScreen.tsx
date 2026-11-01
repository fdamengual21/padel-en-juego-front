import { PERMISSION_CLUB_RESERVATIONS_READ } from "@/authorization";
import { PermissionsGuard } from "@/components/guards";
import DashboardReservationsSection from "./components/DashboardReservationsSection";

export default function ClubDashboardScreen() {
  return (
    <div className="space-y-6" data-testid="club-dashboard">
      <PermissionsGuard permission={PERMISSION_CLUB_RESERVATIONS_READ}>
        <DashboardReservationsSection />
      </PermissionsGuard>
    </div>
  );
}
