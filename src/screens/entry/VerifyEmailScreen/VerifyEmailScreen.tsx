import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { useMockSession } from "@/app/MockSessionProvider";
import { useUser } from "@/app/UserProvider";
import { buttonVariants } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { resolvePostAuthPath } from "@/modules/auth";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

type VerifyStatus = "idle" | "loading" | "success" | "error";

export default function VerifyEmailScreen() {
  const [searchParams] = useSearchParams();
  const { confirmEmailAndResolveUser } = useUser();
  const { isAuthenticated } = useMockSession();
  const userId = searchParams.get("userId")?.trim() ?? "";
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<VerifyStatus>(
    userId && token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    userId && token
      ? "Estamos verificando tu correo…"
      : "El enlace de verificación no es válido.",
  );
  const [continueTo, setContinueTo] = useState<string>(ROUTES.home);
  const started = useRef(false);

  useEffect(() => {
    if (!userId || !token || started.current) return;
    started.current = true;

    const run = async () => {
      try {
        const me = await confirmEmailAndResolveUser({ userId, token });
        setContinueTo(resolvePostAuthPath(me));
        setStatus("success");
        setMessage("Tu correo quedó verificado y ya estás ingresado.");
        toastSuccess("Correo verificado", "Sesión iniciada");
      } catch (err) {
        const text =
          err instanceof Error
            ? err.message
            : "No se pudo verificar el correo";
        setStatus("error");
        setMessage(text);
        toastError("No se pudo verificar el correo", text);
      }
    };

    void run();
  }, [userId, token, confirmEmailAndResolveUser]);

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-background p-6"
      data-testid="verify-email-screen"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <div
          className={cn(
            "mx-auto flex size-12 items-center justify-center rounded-full",
            status === "success"
              ? "bg-primary text-primary-foreground"
              : status === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
          )}
        >
          {status === "loading" ? (
            <LoaderCircle className="size-6 animate-spin" />
          ) : status === "success" ? (
            <CircleCheck className="size-6" />
          ) : (
            <CircleAlert className="size-6" />
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Padel en juego</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {status === "success" ? "Correo verificado" : "Verificar correo"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>

        {status === "success" || (status === "error" && isAuthenticated) ? (
          <Link
            to={continueTo}
            className={cn(buttonVariants(), "inline-flex h-10")}
            data-testid="verify-email-continue"
          >
            Ir al inicio
          </Link>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to={ROUTES.auth.login}
              className={cn(buttonVariants(), "inline-flex h-10")}
            >
              Ingresar
            </Link>
            <Link
              to={ROUTES.auth.checkEmail}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex h-10",
              )}
            >
              Reenviar correo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
