import { useState } from "react";
import { Link } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Api from "@/api/Api";
import TurnstileField from "@/components/auth/TurnstileField";
import { InputField } from "@/components/Form";
import { Button, buttonVariants } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { emailFieldSchema } from "@/modules/auth";
import { ROUTES } from "@/router/routes";
import ExploreWithoutAccountLink from "@/screens/entry/components/ExploreWithoutAccountLink";

interface ForgotPasswordFormValues {
  email: string;
}

const schema: yup.ObjectSchema<ForgotPasswordFormValues> = yup.object({
  email: emailFieldSchema,
});

export default function ForgotPasswordScreen() {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const methods = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = methods;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (!captchaToken) {
      const message = "Completá la verificación.";
      setError(message);
      toastError("No se pudo enviar el correo", message);
      return;
    }
    try {
      const message = await Api.AuthService().forgotPassword({
        email: values.email.trim(),
        captchaToken,
      });
      setSuccessMessage(message);
      toastSuccess(message);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo enviar el correo de recuperación";
      setError(message);
      toastError("No se pudo enviar el correo", message);
    } finally {
      setCaptchaToken(null);
      setCaptchaReset((value) => value + 1);
    }
  });

  return (
    <div
      className="relative flex min-h-svh items-center justify-center bg-background p-6"
      data-testid="forgot-password-screen"
    >
      <div className="w-full max-w-md space-y-6">
        <ExploreWithoutAccountLink />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Start Point</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Recuperar contraseña
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ingresá el email de tu cuenta y te enviamos un enlace para elegir
            una nueva contraseña.
          </p>
        </div>

        {successMessage ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-foreground">{successMessage}</p>
            <Link
              to={ROUTES.auth.login}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Volver a ingresar
            </Link>
          </div>
        ) : (
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
                id="forgot-email"
                required
              />
              <TurnstileField
                action="forgot-password"
                resetKey={captchaReset}
                onTokenChange={setCaptchaToken}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isValid || !captchaToken}
              >
                {isSubmitting ? "Enviando…" : "Enviar enlace"}
              </Button>
            </form>
          </FormProvider>
        )}

        {successMessage ? null : (
          <p className="text-center text-sm text-muted-foreground">
            <Link
              to={ROUTES.auth.login}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Volver a ingresar
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
