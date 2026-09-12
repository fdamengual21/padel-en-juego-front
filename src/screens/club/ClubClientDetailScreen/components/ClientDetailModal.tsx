import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ClientDetailContent from "./ClientDetailContent";

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
  const { data, isLoading, isError } = useQuery({
    queryKey: ["club-client", clubId, clientId],
    queryFn: () =>
      Api.TournamentOpsService().getClubClientDetail(clubId, clientId!),
    enabled: open && Boolean(clientId),
  });

  const title = data?.client.displayName ?? "Cliente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0"
        data-testid="client-detail-modal"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Ficha del cliente en el club
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando cliente…</p>
          ) : isError || !data ? (
            <p className="text-sm text-muted-foreground">
              No se encontró el cliente.
            </p>
          ) : (
            <ClientDetailContent data={data} linkTournaments={false} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
