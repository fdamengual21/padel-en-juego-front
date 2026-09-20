import { useEffect, useState } from "react";
import Api from "@/api/Api";
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
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";

interface CreateCourtDialogProps {
  open: boolean;
  suggestedName: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (courtId: string) => void;
}

export default function CreateCourtDialog({
  open,
  suggestedName,
  onOpenChange,
  onCreated,
}: CreateCourtDialogProps) {
  const [name, setName] = useState(suggestedName);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(90);
  const [basePrice, setBasePrice] = useState("12000");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(suggestedName);
    setSlotDurationMinutes(90);
    setBasePrice("12000");
    setPhotoFile(null);
    setError(null);
    setBusy(false);
  }, [open, suggestedName]);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const price = Number(basePrice);
      if (!name.trim()) throw new Error("Ingresá el nombre de la cancha");
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Precio base inválido");
      }
      const court = await Api.CourtService().create({
        name: name.trim(),
        slotDurationMinutes,
        basePrice: price,
      });
      if (photoFile) {
        await Api.CourtService().uploadPhoto(court.id, photoFile);
      }
      toastSuccess("Cancha creada");
      onCreated(court.id);
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear la cancha";
      setError(message);
      toastError("No se pudo crear la cancha", message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-court-dialog">
        <DialogHeader>
          <DialogTitle>Agregar cancha</DialogTitle>
          <DialogDescription>
            Nombre, duración, precio base y una foto opcional. Las tarifas por
            horario se configuran después.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-court-name">Nombre</Label>
            <Input
              id="new-court-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Cancha 5"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-court-duration">Duración del turno</Label>
              <select
                id="new-court-duration"
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base"
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
              >
                <option value={90}>90 minutos</option>
                <option value={120}>120 minutos</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-court-price">Precio base (ARS)</Label>
              <Input
                id="new-court-price"
                type="number"
                min={0}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-court-photo">Foto (opcional)</Label>
            <Input
              id="new-court-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => void handleCreate()}
          >
            {busy ? "Creando…" : "Crear cancha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
