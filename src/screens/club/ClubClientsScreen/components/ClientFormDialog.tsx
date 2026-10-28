import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useQuery } from "@tanstack/react-query";
import * as yup from "yup";
import Api from "@/api/Api";
import {
  CATEGORY_LEVELS,
  formatCategoryLevel,
  isPlayerSidePreference,
  PLAYER_SIDE_PREFERENCE_OPTIONS,
} from "@/domain";
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
import type { ClubClient } from "@/modules/clients";

interface ClientFormValues {
  firstName: string;
  lastName: string;
  email: string;
  sexId: number | null;
  phoneDialCode: string;
  phoneNational: string;
  categoryLevel: number | null;
  sidePreference: string | null;
}

interface ClientFormDialogProps {
  open: boolean;
  clientId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved?: ClubClient) => void;
  /** Dentro de otro diálogo: no abre uno propio. */
  embedded?: boolean;
  onCancel?: () => void;
}

const schema: yup.ObjectSchema<ClientFormValues> = yup.object({
  firstName: yup.string().trim().required("Ingresá el nombre"),
  lastName: yup.string().trim().required("Ingresá el apellido"),
  email: yup
    .string()
    .trim()
    .email("Email inválido")
    .required("Ingresá el email"),
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
  sidePreference: yup
    .string()
    .nullable()
    .defined()
    .transform((value) => (value == null || value === "" ? null : value))
    .test("side", "Elegí un lado válido", (value) =>
      value == null || isPlayerSidePreference(value),
    ),
});

const emptyValues: ClientFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  sexId: null,
  phoneDialCode: DEFAULT_PHONE_DIAL,
  phoneNational: "",
  categoryLevel: null,
  sidePreference: null,
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
      email: client.email ?? "",
      sexId: client.sexId,
      phoneDialCode: phone.dialCode,
      phoneNational: phone.national,
      categoryLevel: client.categoryLevel,
      sidePreference: client.sidePreference,
    });
  }, [open, clientId, detailQuery.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      sexId: values.sexId!,
      phone: combinePhone(values.phoneDialCode, values.phoneNational),
      categoryLevel: values.categoryLevel!,
      sidePreference: values.sidePreference,
    };
    try {
      if (clientId) {
        const updated = await Api.ClientService().update(clientId, input);
        toastSuccess("Cliente actualizado");
        onSaved(updated);
      } else {
        const created = await Api.ClientService().create(input);
        toastSuccess("Cliente añadido");
        onSaved(created);
      }
      if (embedded) onCancel?.();
      else onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el cliente";
      const alreadyExists = /existe, buscalo con el nombre/i.test(message);
      toastError(
        alreadyExists ? message : "No se pudo guardar el cliente",
        alreadyExists ? undefined : message,
      );
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
          name="email"
          label="Email"
          type="email"
          required
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
        <SelectField
          control={form.control}
          name="sidePreference"
          label="Lado (opcional)"
          allowEmpty
          emptyLabel="Sin preferencia"
          options={PLAYER_SIDE_PREFERENCE_OPTIONS}
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
            Nombre, apellido, email, sexo, teléfono y categoría son obligatorios.
          </DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
