import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useUser } from "@/app/UserProvider";
import TurnstileField from "@/components/auth/TurnstileField";
import { InputField } from "@/components/Form";
import { Button } from "@/components/ui/button";
import { ApiHttpError } from "@/lib/apiClient";
import { toastError, toastSuccess } from "@/lib/toast";
import { isPlayerHomePath, resolvePostAuthPath } from "@/modules/auth";
import { ROUTES } from "@/router/routes";

interface LoginFormValues {
  email: string;
  password: string;
}

const schema: yup.ObjectSchema<LoginFormValues> = yup.object({
  email: yup
    .string()
    .trim()
    .email("Email inválido")
    .required("Ingresá tu email"),
  password: yup.string().required("Ingresá tu contraseña"),
});

export default function LoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginAndResolveUser } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const nextParam = searchParams.get("next");
  const redirectTo = nextParam && !isPlayerHomePath(nextParam) ? nextParam : "";

  const methods = useForm<LoginFormValues>({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isSubmitting, isValid },
  } = methods;

  const checkEmailHref = (email: string) => {
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (redirectTo) params.set("next", redirectTo);
    const qs = params.toString();
    return qs ? `${ROUTES.auth.checkEmail}?${qs}` : ROUTES.auth.checkEmail;
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (!captchaToken) {
      const message = "Completá la verificación.";
      setError(message);
      toastError("No se pudo ingresar", message);
      return;
    }
    try {
      const me = await loginAndResolveUser({ ...values, captchaToken });
      toastSuccess("Sesión iniciada");
      navigate(resolvePostAuthPath(me, nextParam), { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo ingresar";
      setError(message);
      toastError("No se pudo ingresar", message);
      if (err instanceof ApiHttpError && err.status === 403) {
        navigate(checkEmailHref(getValues("email")), { replace: false });
      }
    } finally {
      setCaptchaToken(null);
      setCaptchaReset((value) => value + 1);
    }
  });

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-background p-6"
      data-testid="login-screen"
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Start point</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Ingresar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Usá el email y la contraseña de tu cuenta.
          </p>
        </div>

        <FormProvider {...methods}>
          <form
            className="space-y-4 rounded-xl border border-border bg-card p-5"
            onSubmit={onSubmit}
            noValidate
          >
            <InputField
              control={control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              id="login-email"
              required
            />
            <InputField
              control={control}
              name="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              id="login-password"
              required
            />
            <TurnstileField
              action="login"
              resetKey={captchaReset}
              onTokenChange={setCaptchaToken}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !isValid || !captchaToken}
            >
              {isSubmitting ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </FormProvider>

        <p className="text-center text-sm text-muted-foreground">
          ¿No verificaste el correo?{" "}
          <Link
            to={checkEmailHref("")}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Reenviar enlace
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link
            to={`${ROUTES.auth.register}${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Registrate
          </Link>
        </p>
        <p className="text-center text-sm">
          <Link
            to={ROUTES.home}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Seguir sin cuenta
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          <Link
            to={ROUTES.legal.privacy}
            className="underline-offset-4 hover:underline"
          >
            Privacidad
          </Link>
          {" · "}
          <Link
            to={ROUTES.legal.terms}
            className="underline-offset-4 hover:underline"
          >
            Términos
          </Link>
        </p>
      </div>
    </div>
  );
}
