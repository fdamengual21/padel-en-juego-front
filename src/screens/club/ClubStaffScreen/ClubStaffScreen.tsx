import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import {
  PERMISSION_CLUB_USERS_DEACTIVATE,
  PERMISSION_CLUB_USERS_INVITE,
  PERMISSION_CLUB_USERS_ROLES_ASSIGN,
  usePermissions,
} from "@/authorization";
import { PermissionsGuard } from "@/components/guards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toastError, toastSuccess } from "@/lib/toast";
import { clubRoleLabel } from "@/modules/auth";
import type { ClubStaffMember, ClubStaffStatusFilter } from "@/modules/club-users";
import EditStaffRoleDialog from "./components/EditStaffRoleDialog";
import InviteStaffDialog from "./components/InviteStaffDialog";
import ViewStaffDialog from "./components/ViewStaffDialog";

const filters: { id: ClubStaffStatusFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Activos" },
  { id: "inactive", label: "Dados de baja" },
];

export default function ClubStaffScreen() {
  const { clubId } = useMockSession();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ClubStaffStatusFilter>("active");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [viewing, setViewing] = useState<ClubStaffMember | null>(null);
  const [editing, setEditing] = useState<ClubStaffMember | null>(null);
  const [leaving, setLeaving] = useState<ClubStaffMember | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["club-staff", clubId, status],
    queryFn: () => Api.ClubUserService().list(status),
    enabled: Boolean(clubId),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["club-staff", clubId] });
  };

  const changeStatus = async (member: ClubStaffMember) => {
    setPendingId(member.userId);
    try {
      if (member.isActive) {
        await Api.ClubUserService().deactivate(member.userId);
        toastSuccess("Persona dada de baja");
      } else {
        await Api.ClubUserService().reactivate(member.userId);
        toastSuccess("Persona reactivada");
      }
      refresh();
    } catch (err) {
      toastError(
        member.isActive ? "No se pudo dar de baja" : "No se pudo reactivar",
        err instanceof Error ? err.message : "Intentá de nuevo",
      );
    } finally {
      setPendingId(null);
    }
  };

  const items = data ?? [];

  return (
    <div className="space-y-5" data-testid="club-staff">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Dueños, administradores, organizadores y profesores de este club.
          </p>
        </div>
        <PermissionsGuard permission={PERMISSION_CLUB_USERS_INVITE}>
          <Button type="button" onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" />
            Agregar usuario
          </Button>
        </PermissionsGuard>
      </div>

      <div className="flex gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            size="sm"
            variant={status === filter.id ? "default" : "outline"}
            onClick={() => setStatus(filter.id)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los usuarios.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No hay personas en este filtro.
                </TableCell>
              </TableRow>
            ) : (
              items.map((member) => {
                const name = `${member.firstName} ${member.lastName}`.trim() || "Sin nombre";
                return (
                  <TableRow key={member.userId}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{clubRoleLabel(member.role)}</TableCell>
                    <TableCell>{member.isActive ? "Activo" : "Dado de baja"}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider delay={200}>
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label="Ver"
                                  onClick={() => setViewing(member)}
                                />
                              }
                            >
                              <Eye />
                            </TooltipTrigger>
                            <TooltipContent>Ver</TooltipContent>
                          </Tooltip>
                          {member.isActive && member.canEdit && can(PERMISSION_CLUB_USERS_ROLES_ASSIGN) ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Editar rol"
                                    onClick={() => setEditing(member)}
                                  />
                                }
                              >
                                <Pencil />
                              </TooltipTrigger>
                              <TooltipContent>Editar rol</TooltipContent>
                            </Tooltip>
                          ) : null}
                          {member.isActive && can(PERMISSION_CLUB_USERS_DEACTIVATE) ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    className="text-destructive hover:bg-transparent hover:text-destructive"
                                    aria-label="Dar de baja"
                                    disabled={pendingId === member.userId}
                                    onClick={() => setLeaving(member)}
                                  />
                                }
                              >
                                <Trash2 />
                              </TooltipTrigger>
                              <TooltipContent>Dar de baja</TooltipContent>
                            </Tooltip>
                          ) : null}
                          {!member.isActive && can(PERMISSION_CLUB_USERS_INVITE) ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Reactivar"
                                    disabled={pendingId === member.userId}
                                    onClick={() => void changeStatus(member)}
                                  />
                                }
                              >
                                <UserPlus />
                              </TooltipTrigger>
                              <TooltipContent>Reactivar</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}

      <InviteStaffDialog open={inviteOpen} onOpenChange={setInviteOpen} onSaved={refresh} />
      <ViewStaffDialog
        member={viewing}
        onOpenChange={(next) => {
          if (!next) setViewing(null);
        }}
      />
      <EditStaffRoleDialog
        member={editing}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        onSaved={refresh}
      />
      <Dialog open={leaving !== null} onOpenChange={(next) => { if (!next) setLeaving(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de baja</DialogTitle>
            <DialogDescription>
              {leaving
                ? `${`${leaving.firstName} ${leaving.lastName}`.trim() || leaving.email} deja de entrar a este club. La cuenta sigue existiendo.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLeaving(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={pendingId !== null}
              onClick={() => {
                if (!leaving) return;
                const member = leaving;
                setLeaving(null);
                void changeStatus(member);
              }}
            >
              Dar de baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
