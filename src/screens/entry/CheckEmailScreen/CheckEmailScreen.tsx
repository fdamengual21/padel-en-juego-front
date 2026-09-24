import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Mail } from "lucide-react";
import Api from "@/api/Api";
import { InputField } from "@/components/Form";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { ROUTES } from "@/router/routes";

interface ResendFormValues {
  email: string;
}

const schema: yup.ObjectSchema<ResendFormValues> = yup.object({
  email: yup
    .string()
    .trim()
    .email("Email inválido")
    .required("Ingresá tu email"),
});

export default function CheckEmailScreen() {
  const [searchParams] = useSearchParams();
  const presetEmail = searchParams.get("email")?.trim() ?? "";
  const next = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);

  const methods = useForm<ResendFormValues>({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: { email: presetEmail },
  });
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = methods;

  const loginHref = next
    ? `${ROUTES.auth.login}?next=${encodeURIComponent(next)}`
    : ROUTES.auth.login;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const message = await Api.AuthService().resendConfirmation(values.email);
      toastSuccess("Correo enviado", message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo reenviar el correo";
      setError(message);
      toastError("No se pudo reenviar el correo", message);
    }
  });

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-background p-6"
      data-testid="check-email-screen"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Mail className="size-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Easy padel</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Revisá tu correo
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Te enviamos un enlace para verificar la cuenta
            {presetEmail ? (
              <>
                {" "}
                de <span className="font-medium text-foreground">{presetEmail}</span>
              </>
            ) : null}
            . Cuando lo abras, vas a quedar con la sesión iniciada.
          </p>
        </div>

        <FormProvider {...methods}>
        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5 text-left"
          onSubmit={onSubmit}
          noValidate
        >
          <InputField
            control={control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            id="resend-email"
            required
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            className="w-full"
            variant="outline"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? "Enviando…" : "Reenviar correo"}
          </Button>
        </form>
        </FormProvider>

        <p className="text-sm text-muted-foreground">
          ¿Ya verificaste?{" "}
          <Link
            to={loginHref}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}
