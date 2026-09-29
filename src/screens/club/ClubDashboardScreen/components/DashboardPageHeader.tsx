import dayjs from "dayjs";
import "dayjs/locale/es";
import { Calendar } from "lucide-react";

dayjs.locale("es");

interface DashboardPageHeaderProps {
  firstName: string;
}

export default function DashboardPageHeader({ firstName }: DashboardPageHeaderProps) {
  const greeting = firstName.trim() ? `¡Hola, ${firstName.trim()}!` : "¡Hola!";

  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <h2 className="text-2xl font-semibold tracking-tight">Resumen del club</h2>
        <p className="text-sm text-muted-foreground">Lo más importante de tu club hoy.</p>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Calendar className="size-4" aria-hidden />
        <span>{formatToday()}</span>
      </p>
    </header>
  );
}

function formatToday(): string {
  const raw = dayjs().format("ddd, D MMM YYYY").replaceAll(".", "");
  return `${raw.charAt(0).toUpperCase()}${raw.slice(1)}`;
}
