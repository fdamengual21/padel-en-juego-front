import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Api from "@/api/Api";
import { InputField } from "@/components/Form";
import { Button, buttonVariants } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  newPasswordFormSchema,
  type NewPasswordFormValues,
} from "@/modules/auth";
import { ROUTES } from "@/router/routes";
import { useAuthStore } from "@/stores/authStore";

interface ResetPasswordLocationState {
  resetToken?: string;
}

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetToken = useMemo(() => {
    const state = location.state as ResetPasswordLocationState | null;
    return state?.resetToken?.trim() ?? "";
  }, [location.state]);
  const isResetLinkValid = resetToken.length > 0;

  const methods = useForm<NewPasswordFormValues>({
    resolver: yupResolver(newPasswordFormSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      passwordConfirm: "",
    },
  });
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = methods;

  const onSubmit = handleSubmit(async (values) => {
    if (!isResetLinkValid) {
      const message = "El enlace es inválido o está incompleto.";
      setError(message);
      toastError("No se pudo restablecer la contraseña", message);
      return;
    }
    setError(null);
    try {
      const message = await Api.AuthService().resetPassword({
        token: resetToken,
        password: values.password,
        confirmPassword: values.passwordConfirm,
      });
      setSuccessMessage(message);
      toastSuccess(message);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo restablecer la contraseña";
      setError(message);
      toastError("No se pudo restablecer la contraseña", message);
    }
  });

  return (
    <div
      className="relative flex min-h-svh items-center justify-center bg-background p-6"
      data-testid="reset-password-screen"
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Start Point</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Nueva contraseña
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Elegí una nueva contraseña para tu cuenta.
          </p>
        </div>

        {successMessage ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-foreground">{successMessage}</p>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                clearAuth();
                navigate(ROUTES.auth.login, { replace: true });
              }}
            >
              Ir a ingresar
            </Button>
          </div>
        ) : !isResetLinkValid ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-destructive">
              El enlace es inválido o está incompleto.
            </p>
            <Link
              to={ROUTES.auth.forgotPassword}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Pedir un enlace nuevo
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
                name="password"
                label="Nueva contraseña"
                type="password"
                autoComplete="new-password"
                id="reset-password"
                required
              />
              <InputField
                control={control}
                name="passwordConfirm"
                label="Repetir contraseña"
                type="password"
                autoComplete="new-password"
                id="reset-passwordConfirm"
                required
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isValid}
              >
                {isSubmitting ? "Guardando…" : "Restablecer contraseña"}
              </Button>
            </form>
          </FormProvider>
        )}
      </div>
    </div>
  );
}
