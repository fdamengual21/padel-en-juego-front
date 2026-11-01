import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface CompetitionPanelProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  errorText: string;
  emptyText: string;
  children: ReactNode;
}

export default function CompetitionPanel({
  isLoading,
  isError,
  isEmpty,
  errorText,
  emptyText,
  children,
}: CompetitionPanelProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-6" role="status" aria-label="Cargando">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }
  if (isError) {
    return <p className="py-4 text-center text-sm text-destructive">{errorText}</p>;
  }
  if (isEmpty) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return <div className="space-y-2">{children}</div>;
}
