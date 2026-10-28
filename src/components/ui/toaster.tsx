import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useSettingsStore } from "@/stores/settingsStore";

export default function Toaster({ ...props }: ToasterProps) {
  const theme = useSettingsStore((state) => state.theme);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast border-border bg-card text-foreground shadow-md",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          error: "border-destructive/40",
          success: "border-primary/40",
        },
      }}
      {...props}
    />
  );
}
