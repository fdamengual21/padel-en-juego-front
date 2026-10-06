import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type MessageAlertType = "info" | "success" | "warning" | "red";

interface MessageAlertProps extends ComponentProps<"div"> {
  message: string;
  type: MessageAlertType;
}

const presentation: Record<
  MessageAlertType,
  { variant: "info" | "success" | "warning" | "destructive"; icon: LucideIcon }
> = {
  info: { variant: "info", icon: Info },
  success: { variant: "success", icon: CircleCheck },
  warning: { variant: "warning", icon: TriangleAlert },
  red: { variant: "destructive", icon: CircleX },
};

export default function MessageAlert({
  message,
  type,
  className,
  ...props
}: MessageAlertProps) {
  const { variant, icon: Icon } = presentation[type];
  return (
    <Alert variant={variant} className={className} {...props}>
      <Icon aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
