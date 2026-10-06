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
import { formatCategoryLevel, isCategoryLevel, playerSidePreferenceLabel } from "@/domain";
import { cn } from "@/lib/utils";
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

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["club-client", clubId, clientId],
    queryFn: () => Api.ClientService().getById(clientId!),
    enabled: open && Boolean(clientId),
  });

  const title = data?.fullName || "Cliente";
  const category = isCategoryLevel(data?.categoryLevel)
    ? formatCategoryLevel(data.categoryLevel)
    : null;
  const sideLabel = playerSidePreferenceLabel(data?.sidePreference);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["club-client", clubId, clientId] });
    void queryClient.invalidateQueries({ queryKey: ["club-clients", clubId] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0"
        data-testid="client-detail-modal"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
          <DialogTitle>{editing ? "Editar cliente" : title}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Nombre, apellido, DNI, sexo, teléfono y categoría."
              : "Ficha del cliente en el club"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando cliente…</p>
          ) : isError || !data ? (
            <p className="text-sm text-muted-foreground">No se encontró el cliente.</p>
          ) : editing && !data.hasAccount ? (
            <ClientFormDialog
              embedded
              open
              clientId={data.id}
              onOpenChange={onOpenChange}
              onCancel={() => setEditing(false)}
              onSaved={refresh}
            />
          ) : (
            <div className="space-y-6" data-testid="client-detail-content">
              <PersonDetailCard
                name={data.fullName}
                avatarUrl={data.avatarUrl}
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
                  { label: "DNI", value: data.documentNumber || "Sin DNI" },
                ]}
              />

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

        {!editing && data && !data.hasAccount && can(PERMISSION_CLUB_CLIENTS_WRITE) ? (
          <DialogFooter className="shrink-0 border-t border-border px-4 py-4">
            <Button type="button" onClick={() => setEditing(true)}>
              Editar
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
