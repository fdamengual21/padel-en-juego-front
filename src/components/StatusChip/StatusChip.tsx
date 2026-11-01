import type { ComponentPropsWithoutRef } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Peso visual de un estado, de más a menos llamativo:
 * live > open > upcoming / warning / danger > active / success > scheduled > done / neutral.
 */
export type StatusTone =
  | "live"
  | "open"
  | "upcoming"
  | "scheduled"
  | "active"
  | "success"
  | "warning"
  | "danger"
  | "done"
  | "neutral";

type Indicator = "dot" | "pulse" | LucideIcon | null;

interface ToneStyle {
  className: string;
  indicator: Indicator;
  dotClassName?: string;
}

const tones: Record<StatusTone, ToneStyle> = {
  live: {
    className: "border-transparent bg-destructive-muted text-destructive",
    indicator: "pulse",
    dotClassName: "bg-destructive",
  },
  open: {
    className: "border-transparent bg-primary font-semibold text-primary-foreground",
    indicator: null,
  },
  upcoming: {
    className: "border-primary/60 bg-primary/15 text-foreground",
    indicator: "dot",
    dotClassName: "bg-primary-strong",
  },
  scheduled: {
    className: "border-border bg-card text-foreground",
    indicator: "dot",
    dotClassName: "bg-muted-foreground/60",
  },
  active: {
    className: "border-transparent bg-success-muted text-success-foreground",
    indicator: "dot",
    dotClassName: "bg-success",
  },
  success: {
    className: "border-transparent bg-success-muted text-success-foreground",
    indicator: null,
  },
  warning: {
    className: "border-transparent bg-warning-muted text-warning-foreground",
    indicator: "dot",
    dotClassName: "bg-warning",
  },
  danger: {
    className: "border-transparent bg-destructive-muted text-destructive",
    indicator: null,
  },
  done: {
    className: "border-transparent bg-muted text-muted-foreground",
    indicator: Check,
  },
  neutral: {
    className: "border-transparent bg-muted text-muted-foreground",
    indicator: null,
  },
};

export interface StatusChipProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  tone: StatusTone;
  label: string;
  /** Pisa el indicador del tono. `null` lo oculta. */
  icon?: LucideIcon | null;
}

export default function StatusChip({ tone, label, icon, className, ...props }: StatusChipProps) {
  const style = tones[tone];
  const indicator = icon === undefined ? style.indicator : icon;
  const Icon = typeof indicator === "string" ? null : indicator;

  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 overflow-hidden rounded-full border px-2 text-xs font-medium whitespace-nowrap [&>svg]:size-3 [&>svg]:shrink-0",
        style.className,
        className,
      )}
      {...props}
    >
      {indicator === "dot" || indicator === "pulse" ? (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            style.dotClassName,
            indicator === "pulse" && "animate-pulse",
          )}
          aria-hidden
        />
      ) : Icon ? (
        <Icon aria-hidden />
      ) : null}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
