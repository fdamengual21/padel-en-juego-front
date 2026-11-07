import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Api from "@/api/Api";
import { PERMISSION_CLUB_CLIENTS_WRITE, usePermissions } from "@/authorization";
import PersonDetailCard from "@/components/person/PersonDetailCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import WarningDialog from "@/components/ui/warning-dialog";
import { formatCategoryLevel, isCategoryLevel, playerSidePreferenceLabel } from "@/domain";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ClubClient } from "@/modules/clients";
import ClientFormDialog from "@/screens/club/ClubClientsScreen/components/ClientFormDialog";

interface ClientDetailModalProps {
  open: boolean;
  clubId: string;
  clientId: string | null;
  onOpenChange: (open: boolean) => void;
}

export default function ClientDetailModal({
  open,
  clubId,
  clientId,
  onOpenChange,
}: ClientDetailModalProps) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);
  const [viewId, setViewId] = useState<string | null>(clientId);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setConfirmRemove(false);
      return;
    }
    setViewId(clientId);
  }, [open, clientId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["club-client", clubId, viewId],
    queryFn: () => Api.ClientService().getById(viewId!),
    enabled: open && Boolean(viewId),
  });

  const title = data?.fullName || "Cliente";
  const category = isCategoryLevel(data?.categoryLevel)
    ? formatCategoryLevel(data.categoryLevel)
    : null;
  const sideLabel = playerSidePreferenceLabel(data?.sidePreference);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["club-client"] });
    void queryClient.invalidateQueries({ queryKey: ["club-clients", clubId] });
  };

  const handleSaved = (saved?: ClubClient) => {
    refresh();
    if (saved?.id && saved.id !== viewId) setViewId(saved.id);
    setEditing(false);
  };

  const removeClient = async () => {
    if (!viewId) return;
    setIsRemoving(true);
    try {
      await Api.ClientService().remove(viewId);
      toastSuccess("Cliente quitado del club");
      setConfirmRemove(false);
      refresh();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo quitar el cliente";
      toastError("No se pudo quitar el cliente", message);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-w-3xl flex-col gap-0 overflow-hidden p-0"
          data-testid="client-detail-modal"
        >
          <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
            <DialogTitle>{editing ? "Editar cliente" : title}</DialogTitle>
            <DialogDescription>
              {editing
                ? data?.hasAccount
                  ? "Esta ficha tiene cuenta. Los datos los edita el jugador; el club solo puede dejar una nota."
                  : "Nombre, apellido, email, sexo, teléfono y categoría."
                : "Ficha del cliente en el club"}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando cliente…</p>
            ) : isError || !data ? (
              <p className="text-sm text-muted-foreground">No se encontró el cliente.</p>
            ) : editing ? (
              <ClientFormDialog
                embedded
                open
                clientId={data.id}
                hasAccount={data.hasAccount}
                onOpenChange={onOpenChange}
                onCancel={() => setEditing(false)}
                onSaved={handleSaved}
              />
            ) : (
              <div className="space-y-6" data-testid="client-detail-content">
                <PersonDetailCard
                  name={data.fullName}
                  avatarUrl={data.avatarUrl}
                  userId={data.userId}
                  badges={[
                    category
                      ? { label: `Categoría ${category}` }
                      : { label: "Sin categoría", plain: true },
                    ...(sideLabel ? [{ label: `Lado ${sideLabel}` }] : []),
                  ]}
                  fields={[
                    {
                      label: "Contacto",
                      value: data.phone || "Sin teléfono",
                      phone: data.phone,
                    },
                    { label: "Email", value: data.email || "Sin email" },
                  ]}
                />

                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Nota</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {data.note?.trim() || "—"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-xs text-muted-foreground">Reservas</p>
                    <p className={cn("mt-1 text-2xl font-semibold tabular-nums")}>
                      {data.reservationsCount}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!editing && data && can(PERMISSION_CLUB_CLIENTS_WRITE) ? (
            <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-4 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmRemove(true)}
              >
                Quitar del club
              </Button>
              <Button type="button" onClick={() => setEditing(true)}>
                Editar
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <WarningDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Quitar del club"
        description="Deja de ser cliente de este club. La ficha del jugador no se borra; solo se quita el vínculo con el club."
        confirmLabel="Quitar"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isConfirming={isRemoving}
        onConfirm={() => void removeClient()}
      />
    </>
  );
}
