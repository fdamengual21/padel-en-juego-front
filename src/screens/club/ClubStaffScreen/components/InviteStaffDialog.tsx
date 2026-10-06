import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import * as yup from "yup";
import Api from "@/api/Api";
import Avatar from "@/components/Avatar";
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
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { toastError, toastSuccess } from "@/lib/toast";

interface InviteStaffValues {
  role: string;
}

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const schema: yup.ObjectSchema<InviteStaffValues> = yup.object({
  role: yup.string().required("Elegí un rol"),
});

export default function InviteStaffDialog({
  open,
  onOpenChange,
  onSaved,
}: InviteStaffDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debounced = useDebounce(query, 350);
  const term = debounced.trim();

  const rolesQuery = useQuery({
    queryKey: ["club-roles"],
    queryFn: () => Api.ClubUserService().listRoles(),
    enabled: open,
  });

  const searchQuery = useQuery({
    queryKey: ["club-user-candidates", term],
    queryFn: () => Api.ClubUserService().searchCandidates(term),
    enabled: open && selectedId === null && term.length >= 2,
    placeholderData: keepPreviousData,
  });

  const detailQuery = useQuery({
    queryKey: ["club-user-candidate", selectedId],
    queryFn: () => Api.ClubUserService().getCandidate(selectedId!),
    enabled: open && Boolean(selectedId),
  });

  const methods = useForm<InviteStaffValues>({
    resolver: yupResolver(schema),
    defaultValues: { role: "" },
  });

  useEffect(() => {
    if (open) return;
    setQuery("");
    setSelectedId(null);
    methods.reset({ role: "" });
  }, [open, methods]);

  useEffect(() => {
    if (!open || !selectedId) return;
    const roles = rolesQuery.data ?? [];
    if (roles.length === 0 || methods.getValues("role")) return;
    const preferred =
      roles.find((role) => role.code === "ClubAdmin") ??
      roles.find((role) => role.code !== "ClubOwner") ??
      roles[0];
    if (preferred) methods.setValue("role", preferred.code);
  }, [open, selectedId, rolesQuery.data, methods]);

  const options = (rolesQuery.data ?? []).map((role) => ({
    value: role.code,
    label: role.name,
  }));
  const selectedRole = methods.watch("role");
  const roleInfo = (rolesQuery.data ?? []).find((role) => role.code === selectedRole);

  const onSubmit = methods.handleSubmit(async (values) => {
    if (!selectedId) return;
    try {
      await Api.ClubUserService().invite({ userId: selectedId, role: values.role });
      toastSuccess("Usuario agregado");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toastError(
        "No se pudo agregar",
        err instanceof Error ? err.message : "Intentá de nuevo",
      );
    }
  });

  const detail = detailQuery.data;
  const typed = query.trim();
  const results = (searchQuery.data ?? []).slice(0, 10);
  const waiting =
    typed.length >= 2 && (typed !== term || searchQuery.isFetching);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar usuario</DialogTitle>
          <DialogDescription>
            Buscá una cuenta ya registrada por nombre o email.
          </DialogDescription>
        </DialogHeader>

        {selectedId === null ? (
          <div className="flex flex-col gap-4">
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Buscar</span>
              <Input
                type="search"
                value={query}
                placeholder="Nombre o email"
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {typed.length < 2 ? (
              <p className="text-sm text-muted-foreground">Escribí al menos 2 caracteres.</p>
            ) : (
              <div className="flex flex-col gap-8">
                {waiting ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-5 animate-spin" />
                    Buscando…
                  </div>
                ) : null}
                {searchQuery.isError ? (
                  <p className="text-sm text-destructive">No se pudo buscar.</p>
                ) : !waiting && results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay cuentas con ese dato.</p>
                ) : results.length > 0 ? (
                  <ul className="max-h-64 space-y-1 overflow-auto">
                    {results.map((item) => (
                      <li key={item.userId}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
                          onClick={() => setSelectedId(item.userId)}
                        >
                          <Avatar name={item.fullName || "Usuario"} imageUrl={item.avatarUrl} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {item.fullName || "Sin nombre"}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.maskedEmail}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        ) : detailQuery.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "No se pudo abrir la ficha."}
            </p>
            <Button type="button" variant="outline" onClick={() => setSelectedId(null)}>
              Volver a la búsqueda
            </Button>
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <FormProvider {...methods}>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="flex items-center gap-3">
                <Avatar name={detail.fullName || "Usuario"} imageUrl={detail.avatarUrl} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{detail.fullName || "Sin nombre"}</p>
                  <p className="truncate text-sm text-muted-foreground">{detail.email}</p>
                  <p className="text-sm text-muted-foreground">
                    DNI {detail.documentNumber ?? "sin cargar"}
                  </p>
                </div>
              </div>
              <SelectField name="role" label="Rol" required options={options} />
              {roleInfo?.description ? (
                <p className="text-sm text-muted-foreground">{roleInfo.description}</p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelectedId(null)}>
                  Volver
                </Button>
                <Button type="submit" disabled={methods.formState.isSubmitting}>
                  Confirmar
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
