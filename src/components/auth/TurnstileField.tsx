import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export type TurnstileAction = "login" | "register" | "forgot-password";

export interface TurnstileFieldProps {
  action: TurnstileAction;
  resetKey: number;
  onTokenChange: (token: string | null) => void;
}

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error("Turnstile no cargo."));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Turnstile no cargo.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile no cargo."));
    };
    script.onerror = () => reject(new Error("Turnstile no cargo."));
    document.head.appendChild(script);
  });
}

export default function TurnstileField({
  action,
  resetKey,
  onTokenChange,
}: TurnstileFieldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  onTokenChangeRef.current = onTokenChange;
  const theme = useSettingsStore((state) => state.theme);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

  useEffect(() => {
    if (!siteKey || !hostRef.current) return;

    let cancelled = false;
    const host = hostRef.current;

    void loadScript()
      .then((api) => {
        if (cancelled || !host.isConnected) return;
        widgetIdRef.current = api.render(host, {
          sitekey: siteKey,
          action,
          theme,
          callback: (token) => onTokenChangeRef.current(token),
          "expired-callback": () => onTokenChangeRef.current(null),
          "error-callback": () => onTokenChangeRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) onTokenChangeRef.current(null);
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      if (id && window.turnstile) window.turnstile.remove(id);
      host.replaceChildren();
    };
  }, [action, siteKey, theme]);

  useEffect(() => {
    const id = widgetIdRef.current;
    if (!id || !window.turnstile || resetKey === 0) return;
    window.turnstile.reset(id);
    onTokenChangeRef.current(null);
  }, [resetKey]);

  if (!siteKey) {
    return (
      <p className="text-sm text-destructive">
        Falta la clave de verificación. Revisá la configuración local.
      </p>
    );
  }

  return <div ref={hostRef} className="flex justify-center" data-testid="turnstile-field" />;
}
