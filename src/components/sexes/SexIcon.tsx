import { Mars, Venus, VenusAndMars, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SexCodeKey = "male" | "female" | "x";

interface SexIconProps {
  code?: string | null;
  className?: string;
  title?: string;
  inheritColor?: boolean;
}

const SEX_ICONS: Record<SexCodeKey, LucideIcon> = {
  male: Mars,
  female: Venus,
  x: VenusAndMars,
};

const SEX_ICON_COLOR: Record<SexCodeKey, string> = {
  male: "text-sex-male",
  female: "text-sex-female",
  x: "text-muted-foreground",
};

const SEX_CHIP_IDLE: Record<SexCodeKey, string> = {
  male: "border-sex-male/25 bg-sex-male-muted text-sex-male-foreground",
  female: "border-sex-female/25 bg-sex-female-muted text-sex-female-foreground",
  x: "border-border bg-muted text-muted-foreground",
};

const SEX_CHIP_PRESSED: Record<SexCodeKey, string> = {
  male: "border-sex-male bg-sex-male text-white",
  female: "border-sex-female bg-sex-female text-white",
  x: "border-foreground/20 bg-foreground text-background",
};

export function parseSexCode(code?: string | null): SexCodeKey | null {
  const key = code?.trim().toLowerCase();
  if (key === "male" || key === "female" || key === "x") return key;
  return null;
}

export function sexChipClassName(code?: string | null, pressed = false): string {
  const key = parseSexCode(code);
  if (!key) return "";
  return pressed ? SEX_CHIP_PRESSED[key] : SEX_CHIP_IDLE[key];
}

export default function SexIcon({
  code,
  className,
  title,
  inheritColor = false,
}: SexIconProps) {
  const key = parseSexCode(code);
  if (!key) return null;

  const Icon = SEX_ICONS[key];
  return (
    <span title={title} className="inline-flex">
      <Icon
        aria-hidden={title ? undefined : true}
        aria-label={title}
        className={cn("size-3.5 shrink-0", !inheritColor && SEX_ICON_COLOR[key], className)}
      />
    </span>
  );
}
