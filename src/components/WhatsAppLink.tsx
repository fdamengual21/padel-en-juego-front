import WhatsAppIcon from "@/components/WhatsAppIcon";
import { whatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface WhatsAppLinkProps {
  phone: string | null | undefined;
  className?: string;
}

/** Botón rápido a WhatsApp; no renderiza nada si el teléfono no es usable. */
export default function WhatsAppLink({ phone, className }: WhatsAppLinkProps) {
  const href = whatsappUrl(phone);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-[#25D366] transition-colors hover:bg-[#25D366]/15",
        className,
      )}
      aria-label="Escribir por WhatsApp"
      title="WhatsApp"
      data-testid="whatsapp-quick-link"
    >
      <WhatsAppIcon className="size-4" />
    </a>
  );
}
