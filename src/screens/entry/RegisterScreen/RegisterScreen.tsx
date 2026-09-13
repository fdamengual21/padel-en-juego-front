import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  CATEGORY_LEVELS,
  formatCategoryLevel,
  type CategoryLevel,
} from "@core-api";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import ProvinceCityFields from "@/components/ProvinceCityFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/router/routes";

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  password: string;
  passwordConfirm: string;
  categoryLevel: CategoryLevel;
  province: string;
  city: string;
}

const schema: yup.ObjectSchema<RegisterFormValues> = yup.object({
  firstName: yup.string().trim().required("Ingresá tu nombre"),
  lastName: yup.string().trim().required("Ingresá tu apellido"),
  age: yup
    .number()
    .transform((_value, original) => {
      if (original === "" || original == null) return undefined;
      const n = Number(original);
      return Number.isFinite(n) ? n : undefined;
    })
    .typeError("Ingresá tu edad")
    .min(12, "Debés tener al menos 12 años")
    .max(99, "Edad inválida")
    .required("Ingresá tu edad"),
  email: yup
    .string()
    .trim()
    .email("Email inválido")
    .required("Ingresá tu email"),
  password: yup
    .string()
    .min(8, "Mínimo 8 caracteres")
    .required("Ingresá una contraseña"),
  passwordConfirm: yup
    .string()
    .oneOf([yup.ref("password")], "Las contraseñas no coinciden")
    .required("Repetí la contraseña"),
  categoryLevel: yup
    .mixed<CategoryLevel>()
    .oneOf([...CATEGORY_LEVELS])
    .required("Elegí tu categoría"),
  province: yup.string().trim().required("Elegí tu provincia"),
  city: yup.string().trim().required("Elegí tu localidad"),
});

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginSession } = useMockSession();
  const [error, setError] = useState<string | null>(null);
  const redirectTo = searchParams.get("next") || ROUTES.player.home;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      age: undefined as unknown as number,
      email: "",
      password: "12345678",
      passwordConfirm: "12345678",
      categoryLevel: 6,
      province: "San Luis",
      city: "San Luis",
    },
  });

  const province = watch("province");
  const city = watch("city");

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);
      try {
        const session = await Api.TournamentOpsService().registerAccount({
          firstName: values.firstName,
          lastName: values.lastName,
          age: values.age,
          email: values.email,
          password: values.password,
          categoryLevel: values.categoryLevel,
          province: values.province,
          city: values.city,
        });
        loginSession(session);
        navigate(redirectTo, { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar");
      }
    },
    (formErrors) => {
      const first =
        formErrors.firstName?.message ||
        formErrors.lastName?.message ||
        formErrors.age?.message ||
        formErrors.email?.message ||
        formErrors.password?.message ||
        formErrors.passwordConfirm?.message ||
        formErrors.categoryLevel?.message ||
        formErrors.province?.message ||
        formErrors.city?.message;
      setError(first ?? "Revisá los datos del formulario");
    },
  );

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-background p-6"
      data-testid="register-screen"
    >
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">StartPadel</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Todos los campos son obligatorios. Demo: contraseña 12345678
          </p>
        </div>

        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="reg-firstName">Nombre</Label>
              <Input id="reg-firstName" {...register("firstName")} />
              {errors.firstName ? (
                <p className="text-xs text-destructive">
                  {errors.firstName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-lastName">Apellido</Label>
              <Input id="reg-lastName" {...register("lastName")} />
              {errors.lastName ? (
                <p className="text-xs text-destructive">
                  {errors.lastName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-age">Edad</Label>
              <Input
                id="reg-age"
                type="number"
                min={12}
                max={99}
                {...register("age", { valueAsNumber: true })}
              />
              {errors.age ? (
                <p className="text-xs text-destructive">{errors.age.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-category">Categoría actual</Label>
              <Controller
                name="categoryLevel"
                control={control}
                render={({ field }) => (
                  <select
                    id="reg-category"
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {CATEGORY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {formatCategoryLevel(level)}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>

          <ProvinceCityFields
            idPrefix="reg"
            province={province}
            city={city}
            provinceError={errors.province?.message}
            cityError={errors.city?.message}
            onProvinceChange={(name) => {
              setValue("province", name, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
            onCityChange={(name) => {
              setValue("city", name, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          />

          <div className="space-y-1.5">
            <Label htmlFor="reg-email">Email</Label>
            <Input id="reg-email" type="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Contraseña</Label>
              <Input
                id="reg-password"
                type="password"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-passwordConfirm">Repetir contraseña</Label>
              <Input
                id="reg-passwordConfirm"
                type="password"
                {...register("passwordConfirm")}
              />
              {errors.passwordConfirm ? (
                <p className="text-xs text-destructive">
                  {errors.passwordConfirm.message}
                </p>
              ) : null}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link
            to={`${ROUTES.auth.login}${redirectTo !== ROUTES.player.home ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}
