import { useState } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ClubReservationSummary } from "@/modules/reservations";

interface DashboardSummaryCardsProps {
  summary: ClubReservationSummary | undefined;
  isLoading: boolean;
  isError: boolean;
}

type HelpTopic = "month" | "today";

export default function DashboardSummaryCards({
  summary,
  isLoading,
  isError,
}: DashboardSummaryCardsProps) {
  const [help, setHelp] = useState<HelpTopic | null>(null);

  if (isLoading) {
    return (
      <>
        <CardSkeleton lines={1} />
        <CardSkeleton lines={3} />
        <CardSkeleton hero />
      </>
    );
  }

  if (isError || !summary) {
    return (
      <p className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
        No se pudo cargar la ocupación.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        className="cursor-pointer rounded-xl border border-border bg-card p-4 text-left"
        aria-label="Qué mide la ocupación del mes"
        onClick={() => setHelp("month")}
      >
        <CardHeading label="Ocupación" />
        <p className="mt-3 text-sm font-medium tabular-nums">
          {formatPercent(summary.month.percent)} Este mes
        </p>
      </button>

      <button
        type="button"
        className="cursor-pointer rounded-xl border border-border bg-card p-4 text-left"
        aria-label="Qué mide la ocupación de hoy"
        onClick={() => setHelp("today")}
      >
        <CardHeading label="Hoy" />
        <div className="mt-3 space-y-1">
          <BandLine percent={summary.today.morningPercent} label="Mañana" />
          <BandLine percent={summary.today.afternoonPercent} label="Tarde" />
          <BandLine percent={summary.today.peakPercent} label="Punta" peak />
        </div>
      </button>

      <article className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Turnos libres</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{summary.freeSlots.count}</p>
        <p className="mt-1 text-xs text-muted-foreground">hoy</p>
        <Dialog open={help != null} onOpenChange={(open) => { if (!open) setHelp(null); }}>
          <DialogContent>
            {help === "month" ? <MonthHelp /> : null}
            {help === "today" ? <TodayHelp /> : null}
          </DialogContent>
        </Dialog>
      </article>
    </>
  );
}

export function PendingCountCard({ count }: { count: number }) {
  return (
    <article className="rounded-xl border border-warning/50 bg-warning/15 p-4">
      <p className="text-sm text-muted-foreground">Pendientes</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{count}</p>
      <p className="mt-1 text-xs text-muted-foreground">atención</p>
    </article>
  );
}

export function CardSkeleton({
  lines = 1,
  hero = false,
  emphasis = false,
}: {
  lines?: number;
  hero?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        emphasis ? "border-warning/50 bg-warning/15" : "border-border bg-card",
      )}
      aria-hidden
    >
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      {hero ? <div className="mt-3 h-8 w-12 animate-pulse rounded bg-muted" /> : null}
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="mt-2 h-4 w-28 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

export function PendingTraySkeleton() {
  return (
    <div className="rounded-xl border border-warning/50 bg-warning/15 p-4" aria-hidden>
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-14 animate-pulse rounded-lg bg-card" />
      <div className="mt-2 h-14 animate-pulse rounded-lg bg-card" />
    </div>
  );
}

export function TodayTurnsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="flex gap-3 rounded-2xl bg-primary/15 p-4">
        <div className="h-14 flex-1 animate-pulse rounded-lg bg-card/70" />
        <div className="h-14 flex-1 animate-pulse rounded-lg bg-card/70" />
        <div className="h-14 flex-1 animate-pulse rounded-lg bg-card/70" />
      </div>
    </div>
  );
}

function CardHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Info className="size-3.5 text-muted-foreground" aria-hidden />
    </div>
  );
}

function BandLine({
  percent,
  label,
  peak = false,
}: {
  percent: number | null;
  label: string;
  peak?: boolean;
}) {
  return (
    <p className={cn("text-sm font-medium tabular-nums", peak && peakTone(percent))}>
      {`${formatPercent(percent)} ${label}`}
    </p>
  );
}

function peakTone(percent: number | null): string {
  if (percent == null) return "text-foreground";
  if (percent < 55) return "text-destructive";
  if (percent < 75) return "text-warning";
  if (percent < 90) return "text-success";
  return "text-primary-strong";
}

function formatPercent(percent: number | null): string {
  return percent == null ? "—" : `${percent}%`;
}

function MonthHelp() {
  return (
    <DialogHeader>
      <DialogTitle>Ocupación</DialogTitle>
      <DialogDescription>
        Turnos aceptados o completados, y los fijos vigentes, sobre todos los que genera el horario del mes, de la apertura al cierre. La mañana y la siesta vacías bajan el número y es esperable. No se compara con la punta.
      </DialogDescription>
    </DialogHeader>
  );
}

function TodayHelp() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Hoy</DialogTitle>
        <DialogDescription>
          Mañana es de 08:00 a 14:00 y tarde de 14:00 a 18:00. Esas dos se muestran sin alarma. La punta es desde las 18:00 e incluye el turno de las 22:00, confirmado o ya en juego. El de las 00:00 no entra.
        </DialogDescription>
      </DialogHeader>
      <ul className="space-y-1.5 text-sm">
        <Legend dot="bg-destructive" label="Menos de 55 % Baja" />
        <Legend dot="bg-warning" label="55–74 % Regular" />
        <Legend dot="bg-success" label="75–89 % Buena" />
        <Legend dot="bg-primary-strong" label="90 % o más Casi llena" />
      </ul>
      <p className="text-xs text-muted-foreground">
        Playtomic, Global Padel Report 2026. En Argentina el pico de lunes a viernes es de 19:00 a 23:00.
      </p>
    </>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden />
      <span>{label}</span>
    </li>
  );
}
