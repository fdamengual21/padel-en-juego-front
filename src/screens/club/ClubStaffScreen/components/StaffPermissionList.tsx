import { clubPermissionLabel } from "@/modules/club-users";

interface StaffPermissionListProps {
  permissions: string[];
}

/** Qué puede hacer el rol, en dos columnas. Va aparte de la ficha de la persona. */
export default function StaffPermissionList({ permissions }: StaffPermissionListProps) {
  if (permissions.length === 0) {
    return <p className="text-sm text-muted-foreground">Este rol no tiene permisos cargados.</p>;
  }

  return (
    <ul className="grid list-disc grid-cols-1 gap-x-8 gap-y-1 pl-5 text-sm sm:grid-cols-2">
      {permissions.map((code) => (
        <li key={code}>{clubPermissionLabel(code)}</li>
      ))}
    </ul>
  );
}
