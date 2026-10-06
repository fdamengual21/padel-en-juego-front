import PersonDetailCard from "@/components/person/PersonDetailCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clubRoleLabel } from "@/modules/auth";
import type { ClubStaffMember } from "@/modules/club-users";
import StaffPermissionList from "./StaffPermissionList";

interface ViewStaffDialogProps {
  member: ClubStaffMember | null;
  onOpenChange: (open: boolean) => void;
}

export default function ViewStaffDialog({ member, onOpenChange }: ViewStaffDialogProps) {
  const name = member
    ? `${member.firstName} ${member.lastName}`.trim() || "Sin nombre"
    : "";

  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Usuario</DialogTitle>
          <DialogDescription>Ficha y permisos de este club.</DialogDescription>
        </DialogHeader>
        {member ? (
          <div className="space-y-6">
            <PersonDetailCard
              name={name}
              avatarUrl={member.avatarUrl}
              badges={[
                { label: clubRoleLabel(member.role) },
                { label: member.isActive ? "Activo" : "Dado de baja" },
              ]}
              fields={[
                {
                  label: "Contacto",
                  value: member.phone || "Sin teléfono",
                  phone: member.phone,
                },
                { label: "DNI", value: member.documentNumber || "Sin DNI" },
                { label: "Email", value: member.maskedEmail || "Sin email" },
              ]}
            />
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Puede hacer</h3>
              <StaffPermissionList permissions={member.permissions} />
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
