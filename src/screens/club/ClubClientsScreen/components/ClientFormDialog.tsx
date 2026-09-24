import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useQuery } from "@tanstack/react-query";
import * as yup from "yup";
import Api from "@/api/Api";
import { CATEGORY_LEVELS, formatCategoryLevel } from "@/domain";
import { InputField, PhoneField, SelectField } from "@/components/Form";
import { PERMISSION_CLUB_CLIENTS_WRITE } from "@/authorization";
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
import { combinePhone, isValidOptionalPhone, splitE164, DEFAULT_PHONE_DIAL } from "@/lib/phone";
import { toastError, toastSuccess } from "@/lib/toast";

interface ClientFormValues {
  firstName: string;
  lastName: string;
  documentNumber: string;
  sexId: number | null;
  phoneDialCode: string;
  phoneNational: string;
  categoryLevel: number | null;
}

interface ClientFormDialogProps {
  open: boolean;
  clientId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  /** Dentro de otro diálogo: no abre uno propio. */
  embedded?: boolean;
  onCancel?: () => void;
}

const schema: yup.ObjectSchema<ClientFormValues> = yup.object({
  firstName: yup.string().trim().required("Ingresá el nombre"),
  lastName: yup.string().trim().required("Ingresá el apellido"),
  documentNumber: yup
    .string()
    .trim()
    .matches(/^\d{7,8}$/, "El DNI tiene 7 u 8 dígitos")
    .required("Ingresá el DNI"),
  sexId: yup
    .number()
    .nullable()
    .required("Elegí el sexo"),
  phoneDialCode: yup.string().required(),
  phoneNational: yup
    .string()
    .required("Ingresá el teléfono")
    .test("phone", "Ingresá un teléfono válido", function validatePhone(value) {
      return isValidOptionalPhone(this.parent.phoneDialCode, value) && Boolean(combinePhone(this.parent.phoneDialCode, value));
    }),
  categoryLevel: yup
    .number()
    .nullable()
    .required("Elegí la categoría")
    .min(1, "Elegí la categoría")
    .max(8, "Elegí la categoría"),
});

const emptyValues: ClientFormValues = {
  firstName: "",
  lastName: "",
  documentNumber: "",
  sexId: null,
  phoneDialCode: DEFAULT_PHONE_DIAL,
  phoneNational: "",
  categoryLevel: null,
};

export default function ClientFormDialog({
  open,
  clientId,
  onOpenChange,
  onSaved,
  embedded = false,
  onCancel,
}: ClientFormDialogProps) {
  const editing = Boolean(clientId);
  const form = useForm<ClientFormValues>({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: emptyValues,
  });

  const sexesQuery = useQuery({
    queryKey: ["sexes"],
    queryFn: () => Api.SexService().list(),
    enabled: open,
  });

  const detailQuery = useQuery({
    queryKey: ["club-client", clientId],
    queryFn: () => Api.ClientService().getById(clientId!),
    enabled: open && Boolean(clientId),
  });

  useEffect(() => {
    if (!open) return;
    if (!clientId) {
      form.reset(emptyValues);
      return;
    }
    const client = detailQuery.data;
    if (!client) return;
    const phone = splitE164(client.phone);
    form.reset({
      firstName: client.firstName,
      lastName: client.lastName,
      documentNumber: client.documentNumber ?? "",
      sexId: client.sexId,
      phoneDialCode: phone.dialCode,
      phoneNational: phone.national,
      categoryLevel: client.categoryLevel,
    });
  }, [open, clientId, detailQuery.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      documentNumber: values.documentNumber.trim(),
      sexId: values.sexId!,
      phone: combinePhone(values.phoneDialCode, values.phoneNational),
      categoryLevel: values.categoryLevel!,
    };
    try {
      if (clientId) {
        await Api.ClientService().update(clientId, input);
        toastSuccess("Cliente actualizado");
      } else {
        await Api.ClientService().create(input);
        toastSuccess("Cliente añadido");
      }
      onSaved();
      if (embedded) onCancel?.();
      else onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el cliente";
      toastError("No se pudo guardar el cliente", message);
    }
  });

  const sexOptions = (sexesQuery.data ?? []).map((sex) => ({
    value: String(sex.id),
    label: sex.name,
  }));

  const formBody = (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField control={form.control} name="firstName" label="Nombre" required />
          <InputField control={form.control} name="lastName" label="Apellido" required />
        </div>
        <InputField
          control={form.control}
          name="documentNumber"
          label="DNI"
          required
          inputMode="numeric"
        />
        <SelectField
          control={form.control}
          name="sexId"
          label="Sexo"
          required
          valueAs="number"
          options={sexOptions}
          allowEmpty
          emptyLabel="Elegí el sexo"
        />
        <PhoneField
          control={form.control}
          dialName="phoneDialCode"
          nationalName="phoneNational"
          label="Teléfono"
          required
        />
        <SelectField
          control={form.control}
          name="categoryLevel"
          label="Categoría"
          required
          valueAs="number"
          options={CATEGORY_LEVELS.map((level) => ({
            value: String(level),
            label: formatCategoryLevel(level),
          }))}
          allowEmpty
          emptyLabel="Elegí la categoría"
        />
        <DialogFooter className="gap-2 sm:justify-between">
          {embedded ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          ) : (
            <span />
          )}
          <PermissionsGuard permission={PERMISSION_CLUB_CLIENTS_WRITE}>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              {editing ? "Guardar" : "Añadir cliente"}
            </Button>
          </PermissionsGuard>
        </DialogFooter>
      </form>
    </FormProvider>
  );

  if (embedded) return formBody;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="client-form-dialog">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cliente" : "Añadir cliente"}</DialogTitle>
          <DialogDescription>
            Nombre, apellido, DNI, sexo, teléfono y categoría son obligatorios.
          </DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
