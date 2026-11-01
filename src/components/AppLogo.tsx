import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
}

export default function AppLogo({ className }: AppLogoProps) {
  return (
    <img
      src={logo}
      alt="Start Point"
      width={160}
      height={160}
      draggable={false}
      className={cn("size-9 shrink-0 select-none", className)}
    />
  );
}
