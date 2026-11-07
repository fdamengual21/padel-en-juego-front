import { useEffect, type CSSProperties } from "react";
import {
  Toaster as Sonner,
  toast,
  useSonner,
  type ToasterProps,
} from "sonner";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * Sonner captura el pointer en el toast (swipe) antes del click de la cruz.
 * Con React 19 eso se traga el onClick, sobre todo al instante / al tocar el SVG.
 * Dismiss en pointerdown (capture) evita el gesto y cierra de inmediato.
 */
function useImmediateToastDismiss() {
  const { toasts } = useSonner();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as Element | null;
      if (typeof target?.closest !== "function") return;

      const closeButton = target.closest("[data-close-button]");
      if (!closeButton) return;

      const toastNode = closeButton.closest("[data-sonner-toast]");
      if (!toastNode) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("[data-sonner-toast]"),
      );
      const index = nodes.indexOf(toastNode as HTMLElement);
      const id = toasts[index]?.id;
      if (id !== undefined) toast.dismiss(id);
      else toast.dismiss();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [toasts]);
}

export default function Toaster({ ...props }: ToasterProps) {
  const theme = useSettingsStore((state) => state.theme);
  useImmediateToastDismiss();

  return (
    <Sonner
      theme={theme}
      className="toaster group pointer-events-auto"
      position="top-right"
      duration={5000}
      richColors
      closeButton
      style={
        {
          // Cruz adentro (arriba a la derecha); afuera se pierde hit-area al animar.
          "--toast-close-button-start": "unset",
          "--toast-close-button-end": "6px",
          "--toast-close-button-transform": "translateY(6px)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto border-border bg-card text-foreground shadow-md",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          closeButton: "[&_svg]:pointer-events-none",
          error: "border-destructive/40",
          success: "border-primary/40",
        },
      }}
      {...props}
    />
  );
}
