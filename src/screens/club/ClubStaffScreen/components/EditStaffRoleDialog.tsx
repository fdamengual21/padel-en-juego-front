import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useQuery } from "@tanstack/react-query";
import * as yup from "yup";
import Api from "@/api/Api";
import { SelectField } from "@/components/Form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ClubStaffMember } from "@/modules/club-users";
import StaffPermissionList from "./StaffPermissionList";

interface EditStaffRoleValues {
  role: string;
}

interface EditStaffRoleDialogProps {
  member: ClubStaffMember | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const schema: yup.ObjectSchema<EditStaffRoleValues> = yup.object({
  role: yup.string().required("Elegí un rol"),
});

export default function EditStaffRoleDialog({
  member,
  onOpenChange,
  onSaved,
}: EditStaffRoleDialogProps) {
  const open = member !== null;
  const rolesQuery = useQuery({
    queryKey: ["club-roles"],
    queryFn: () => Api.ClubUserService().listRoles(),
    enabled: open,
  });

  const methods = useForm<EditStaffRoleValues>({
    resolver: yupResolver(schema),
    defaultValues: { role: member?.role ?? "" },
  });

  useEffect(() => {
    methods.reset({ role: member?.role ?? "" });
  }, [member?.userId, member?.role, methods]);

  const selected = useWatch({ control: methods.control, name: "role" });
  const role = (rolesQuery.data ?? []).find((item) => item.code === selected);

  const onSubmit = methods.handleSubmit(async (values) => {
    if (!member) return;
    try {
      await Api.ClubUserService().assignRole(member.userId, { role: values.role });
      toastSuccess("Rol actualizado");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toastError(
        "No se pudo cambiar el rol",
        err instanceof Error ? err.message : "Intentá de nuevo",
      );
    }
  });

  const name = member ? `${member.firstName} ${member.lastName}`.trim() || member.email : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rol de {name}</DialogTitle>
          <DialogDescription>
            El rol define los permisos. No se editan uno por uno.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form className="space-y-4" onSubmit={onSubmit}>
            <SelectField
              name="role"
              label="Rol"
              required
              options={(rolesQuery.data ?? []).map((item) => ({
                value: item.code,
                label: item.name,
              }))}
            />
            {role ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{role.description}</p>
                <StaffPermissionList permissions={role.permissions} />
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={methods.formState.isSubmitting}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
