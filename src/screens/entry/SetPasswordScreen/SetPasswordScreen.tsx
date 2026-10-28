import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Api from "@/api/Api";
import { InputField } from "@/components/Form";
import { Button, buttonVariants } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  newPasswordFormSchema,
  type NewPasswordFormValues,
} from "@/modules/auth";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

export default function SetPasswordScreen() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId")?.trim() ?? "";
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = useState(false);
  const methods = useForm<NewPasswordFormValues>({
    resolver: yupResolver(newPasswordFormSchema),
    mode: "onChange",
    defaultValues: { password: "", passwordConfirm: "" },
  });

  const onSubmit = methods.handleSubmit(async (values) => {
    try {
      await Api.AuthService().acceptInvite({
        userId,
        token,
        password: values.password,
      });
      setDone(true);
      toastSuccess("Contraseña lista", "Ya podés ingresar");
    } catch (err) {
      toastError(
        "No se pudo guardar la contraseña",
        err instanceof Error ? err.message : "El enlace no es válido",
      );
    }
  });

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Definí tu contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Te invitaron como usuario de un club. Con esta clave vas a poder ingresar.
          </p>
        </div>
        {done ? (
          <Link to={ROUTES.auth.login} className={cn(buttonVariants(), "w-full")}>
            Ingresar
          </Link>
        ) : !userId || !token ? (
          <p className="text-center text-sm text-destructive">El enlace de invitación no es válido.</p>
        ) : (
          <FormProvider {...methods}>
            <form className="space-y-4" onSubmit={onSubmit}>
              <InputField name="password" label="Contraseña" type="password" required autoComplete="new-password" />
              <InputField
                name="passwordConfirm"
                label="Repetir contraseña"
                type="password"
                required
                autoComplete="new-password"
              />
              <Button
                type="submit"
                className="w-full"
                disabled={
                  methods.formState.isSubmitting || !methods.formState.isValid
                }
              >
                Guardar contraseña
              </Button>
            </form>
          </FormProvider>
        )}
      </div>
    </div>
  );
}
