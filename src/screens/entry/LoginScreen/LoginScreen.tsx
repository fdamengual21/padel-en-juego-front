import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { loginSession } = useMockSession();
  const [error, setError] = useState<string | null>(null);
  const redirectTo = searchParams.get("next") || ROUTES.player.home;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: { email: "juan@padel.test", password: "12345678" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const session = await Api.TournamentOpsService().login(values);
      loginSession(session);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ingresar");
    }
  });

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-background p-6"
      data-testid="login-screen"
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">StartPadel</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Ingresar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Demo: juan@padel.test / 12345678
          </p>
        </div>

        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Contraseña</Label>
            <Input
              id="login-password"
              type="password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link
            to={`${ROUTES.auth.register}${redirectTo !== ROUTES.player.home ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Registrate
          </Link>
        </p>
        <p className="text-center text-sm">
          <Link
            to={ROUTES.player.home}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Seguir sin cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
