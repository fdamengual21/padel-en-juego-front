import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CalendarRange, ChevronRight, CircleDollarSign, Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClubReservationSummary } from "@/modules/reservations";
import DashboardIconWell from "@/screens/club/components/DashboardIconWell";
import { OccupancyDetailDialog } from "./DashboardOccupancyHelp";

interface OccupancyCardProps {
  summary: ClubReservationSummary | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function OccupancyCard({ summary, isLoading, isError }: OccupancyCardProps) {
  const [open, setOpen] = useState(false);

  if (isLoading) return <OccupancySkeleton />;

  return (
    <>
      <button
        type="button"
        className="flex h-full w-full cursor-pointer flex-col rounded-xl border border-border bg-card p-4 text-left"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DashboardIconWell icon={CalendarRange} />
            <p className="text-sm text-muted-foreground">Ocupación</p>
          </div>
          <Info className="size-4 text-muted-foreground" aria-hidden />
        </div>
        {isError || !summary ? (
          <p className="mt-3 text-sm text-muted-foreground">No se pudo cargar la ocupación.</p>
        ) : (
          <>
            <p className="mt-3 text-3xl font-semibold leading-none tabular-nums tracking-tight">
              {formatPercent(summary.month.percent)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">este mes</p>
            {summary.month.deltaPercent != null ? (
              <p className={cn("mt-1 text-xs font-medium", deltaTone(summary.month.deltaPercent))}>
                {formatDelta(summary.month.deltaPercent)}
              </p>
            ) : null}
            <div className="mt-4 space-y-2">
              <BandRow label="Mañana" percent={summary.today.morningPercent} />
              <BandRow label="Tarde" percent={summary.today.afternoonPercent} />
              <BandRow label="Pico" percent={summary.today.peakPercent} peak />
            </div>
            <span className="mt-3 self-end text-sm font-medium text-primary-strong">Ver detalle</span>
          </>
        )}
      </button>
      <OccupancyDetailDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

interface FreeSlotsCardProps {
  summary: ClubReservationSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  href?: string;
}

const compactCard = "flex h-full min-h-0 flex-1 flex-col rounded-xl border border-border bg-card p-3";

export function FreeSlotsCard({ summary, isLoading, isError, href }: FreeSlotsCardProps) {
  if (isLoading) return <CompactSkeleton />;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DashboardIconWell icon={Calendar} />
          <p className="text-sm text-muted-foreground">Turnos libres</p>
        </div>
        {href ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden /> : null}
      </div>
      {isError || !summary ? (
        <p className="mt-2 text-sm text-muted-foreground">No se pudieron cargar los turnos libres.</p>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold leading-none tabular-nums tracking-tight">
            {summary.freeSlots.count}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">hoy</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {`${summary.freeSlots.withinThreeHours} en las próximas 3 h`}
          </p>
        </>
      )}
    </>
  );

  if (!href || isError || !summary) {
    return <article className={compactCard}>{body}</article>;
  }

  return (
    <Link to={href} className={cn(compactCard, "transition-colors hover:bg-muted/40")}>
      {body}
    </Link>
  );
}

interface IncomeCardProps {
  summary: ClubReservationSummary | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function IncomeCard({ summary, isLoading, isError }: IncomeCardProps) {
  if (isLoading) return <CompactSkeleton />;

  const income = summary?.income;
  return (
    <article className={cn(compactCard, "bg-success/10")}>
      <div className="flex items-center gap-2">
        <DashboardIconWell icon={CircleDollarSign} tone="accent" />
        <p className="text-sm text-muted-foreground">Ingresos del día</p>
      </div>
      {isError || !income ? (
        <p className="mt-2 text-sm text-muted-foreground">No se pudieron cargar los ingresos.</p>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold leading-none tabular-nums tracking-tight">
            {formatMoney(income.amount)}
          </p>
          {income.deltaPercent != null ? (
            <p className={cn("mt-1 text-xs font-medium", deltaTone(income.deltaPercent))}>
              {formatDelta(income.deltaPercent, "ayer")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">hoy</p>
          )}
        </>
      )}
    </article>
  );
}

function BandRow({
  label,
  percent,
  peak = false,
}: {
  label: string;
  percent: number | null;
  peak?: boolean;
}) {
  const tone = peak ? peakTone(percent) : null;
  return (
    <div className="grid grid-cols-[4.25rem_2.25rem_1fr_auto] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium tabular-nums">{formatPercent(percent)}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", tone?.bar ?? "bg-foreground/25")}
          style={{ width: percent == null ? "0%" : `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </span>
      {tone ? (
        <Badge variant="secondary" className={cn("h-auto px-1.5 py-0.5 text-xs", tone.badge)}>
          {tone.label}
        </Badge>
      ) : (
        <span />
      )}
    </div>
  );
}

function peakTone(percent: number | null): { bar: string; badge: string; label: string } | null {
  if (percent == null) return null;
  if (percent < 55) {
    return {
      bar: "bg-destructive",
      badge: "border-transparent! bg-destructive/15! text-destructive",
      label: "Baja",
    };
  }
  if (percent < 75) {
    return {
      bar: "bg-warning",
      badge: "border-transparent! bg-warning/20! text-warning",
      label: "Regular",
    };
  }
  if (percent < 90) {
    return {
      bar: "bg-success",
      badge: "border-transparent! bg-success/15! text-success",
      label: "Buena",
    };
  }
  return {
    bar: "bg-primary-strong",
    badge: "border-transparent! bg-primary/30! text-primary-strong",
    label: "Casi llena",
  };
}

function deltaTone(delta: number): string {
  if (delta > 0) return "text-success";
  if (delta < 0) return "text-destructive";
  return "text-muted-foreground";
}

function formatDelta(delta: number, against = "mes anterior"): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} % vs. ${against}`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(percent: number | null): string {
  return percent == null ? "—" : `${percent}%`;
}

function OccupancySkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4" aria-hidden>
      <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
      <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
      <div className="mt-4 space-y-2">
        <div className="h-2 animate-pulse rounded-full bg-muted" />
        <div className="h-2 animate-pulse rounded-full bg-muted" />
        <div className="h-2 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

function CompactSkeleton() {
  return (
    <div className="min-h-24 flex-1 rounded-xl border border-border bg-card p-3" aria-hidden>
      <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
      <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}
