import WhatsAppLink from "@/components/WhatsAppLink";
import { whatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface PhoneWhatsAppProps {
  phone: string | null | undefined;
  className?: string;
}

/** Número + acceso a WhatsApp. No renderiza si no hay teléfono. */
export default function PhoneWhatsApp({ phone, className }: PhoneWhatsAppProps) {
  const display = phone?.trim();
  if (!display) return null;

  const href = whatsappUrl(display);

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate hover:underline"
        >
          {display}
        </a>
      ) : (
        <span className="truncate">{display}</span>
      )}
      <WhatsAppLink phone={display} className="size-5" />
    </span>
  );
}
