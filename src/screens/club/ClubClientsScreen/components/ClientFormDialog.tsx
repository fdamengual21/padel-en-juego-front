import { useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useQuery } from "@tanstack/react-query";
import * as yup from "yup";
import Api from "@/api/Api";
import {
  CATEGORY_LEVELS,
  formatCategoryLevel,
  isCategoryLevel,
  isPlayerSidePreference,
  PLAYER_SIDE_PREFERENCE_OPTIONS,
  playerSidePreferenceLabel,
} from "@/domain";
import { InputField, PhoneField, SelectField, TextareaField } from "@/components/Form";
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
  note: string;
}

interface ClientFormContext {
  hasAccount: boolean;
}

interface ClientFormDialogProps {
  open: boolean;
  clientId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved?: ClubClient) => void;
  /** Dentro de otro diálogo: no abre uno propio. */
  embedded?: boolean;
  onCancel?: () => void;
  hasAccount?: boolean;
}

const noteSchema = yup
  .string()
  .defined()
  .transform((value) => (value == null ? "" : String(value)))
  .max(500, "La nota no puede superar 500 caracteres");

const sidePreferenceSchema = yup
  .string()
  .nullable()
  .defined()
  .transform((value) => (value == null || value === "" ? null : value))
  .test("side", "Elegí un lado válido", (value) =>
    value == null || isPlayerSidePreference(value),
  );

const schema: yup.ObjectSchema<ClientFormValues> = yup.object({
  firstName: yup.string().trim().required("Ingresá el nombre"),
  lastName: yup.string().trim().required("Ingresá el apellido"),
  email: yup.string().trim().email("Email inválido").required("Ingresá el email"),
  sexId: yup.number().nullable().required("Elegí el sexo"),
  phoneDialCode: yup.string().required(),
  phoneNational: yup
    .string()
    .required("Ingresá el teléfono")
    .test("phone", "Ingresá un teléfono válido", function validatePhone(value) {
      return (
        isValidOptionalPhone(this.parent.phoneDialCode, value) &&
        Boolean(combinePhone(this.parent.phoneDialCode, value))
      );
    }),
  categoryLevel: yup
    .number()
    .nullable()
    .required("Elegí la categoría")
    .min(1, "Elegí la categoría")
    .max(8, "Elegí la categoría"),
  sidePreference: sidePreferenceSchema,
  note: noteSchema,
});

const linkedSchema: yup.ObjectSchema<ClientFormValues> = yup.object({
  firstName: yup.string().defined(),
  lastName: yup.string().defined(),
  email: yup.string().defined(),
  sexId: yup.number().nullable().defined(),
  phoneDialCode: yup.string().defined(),
  phoneNational: yup.string().defined(),
  categoryLevel: yup.number().nullable().defined(),
  sidePreference: sidePreferenceSchema,
  note: noteSchema,
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
  note: "",
};

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function ReadValue({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-foreground">{displayValue(value)}</p>
    </div>
  );
}

export default function ClientFormDialog({
  open,
  clientId,
  onOpenChange,
  onSaved,
  embedded = false,
  onCancel,
  hasAccount: hasAccountProp,
}: ClientFormDialogProps) {
  const editing = Boolean(clientId);
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

  const hasAccount = Boolean(hasAccountProp ?? detailQuery.data?.hasAccount);
  const hasAccountRef = useRef(hasAccount);
  hasAccountRef.current = hasAccount;
  const form = useForm<ClientFormValues, ClientFormContext>({
    resolver: (values, _context, options) =>
      yupResolver(hasAccountRef.current ? linkedSchema : schema)(
        values,
        { hasAccount: hasAccountRef.current },
        options,
      ),
    mode: "onChange",
    defaultValues: emptyValues,
    context: { hasAccount },
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
      note: client.note ?? "",
    });
  }, [open, clientId, detailQuery.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      sexId: values.sexId ?? 0,
      phone: combinePhone(values.phoneDialCode, values.phoneNational),
      categoryLevel: values.categoryLevel ?? 0,
      sidePreference: values.sidePreference,
      note: values.note.trim() || null,
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
  const watched = form.watch();
  const sexLabel = sexOptions.find((option) => option.value === String(watched.sexId))?.label;
  const categoryLabel = isCategoryLevel(watched.categoryLevel)
    ? formatCategoryLevel(watched.categoryLevel)
    : null;
  const sideLabel = playerSidePreferenceLabel(watched.sidePreference);
  const phoneLabel = combinePhone(watched.phoneDialCode, watched.phoneNational);
  const accountCopy =
    "Esta ficha tiene cuenta. Los datos los edita el jugador; el club solo puede dejar una nota.";

  const identityFields = hasAccount ? (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReadValue label="Nombre" value={watched.firstName} />
        <ReadValue label="Apellido" value={watched.lastName} />
      </div>
      <ReadValue label="Email" value={watched.email} />
      <ReadValue label="Sexo" value={sexLabel} />
      <ReadValue label="Teléfono" value={phoneLabel} />
      <ReadValue label="Categoría" value={categoryLabel} />
      <ReadValue label="Lado" value={sideLabel} />
    </>
  ) : (
    <>
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
    </>
  );

  const formBody = (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={onSubmit}>
        {identityFields}
        <TextareaField
          control={form.control}
          name="note"
          label="Nota (opcional)"
          rows={2}
          maxLength={500}
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
            {hasAccount
              ? accountCopy
              : "Nombre, apellido, email, sexo, teléfono y categoría son obligatorios."}
          </DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
