import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldHintProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

/** Texto aclaratorio bajo un campo. Distinto del mensaje de error de Yup. */
export default function FieldHint({ children, id, className }: FieldHintProps) {
  return (
    <p id={id} className={cn("text-xs text-muted-foreground", className)}>
      {children}
    </p>
  );
}
