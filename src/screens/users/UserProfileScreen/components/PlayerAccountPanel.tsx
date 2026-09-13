import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CATEGORY_LEVELS,
  formatCategoryLevel,
  type CategoryLevel,
  type Player,
} from "@core-api";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CategoryHistoryList from "./CategoryHistoryList";

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  categoryLevel: CategoryLevel;
}

const profileSchema: yup.ObjectSchema<ProfileFormValues> = yup.object({
  firstName: yup.string().trim().required("Ingresá tu nombre"),
  lastName: yup.string().trim().required("Ingresá tu apellido"),
  phone: yup.string().default(""),
  email: yup
    .string()
    .default("")
    .test("email", "Email inválido", (value) => {
      if (!value?.trim()) return true;
      return yup.string().email().isValidSync(value);
    }),
  categoryLevel: yup
    .mixed<CategoryLevel>()
    .oneOf([...CATEGORY_LEVELS])
    .required("Elegí tu categoría"),
});

function toFormValues(player: Player): ProfileFormValues {
  return {
    firstName: player.firstName,
    lastName: player.lastName,
    phone: player.phone ?? "",
    email: player.email ?? "",
    categoryLevel: player.categoryLevel,
  };
}

interface PlayerAccountPanelProps {
  player: Player;
}

export default function PlayerAccountPanel({ player }: PlayerAccountPanelProps) {
  const queryClient = useQueryClient();
  const { playerId, loginSession, user } = useMockSession();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: yupResolver(profileSchema),
    mode: "onChange",
    defaultValues: toFormValues(player),
  });

  useEffect(() => {
    reset(toFormValues(player));
  }, [player, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      Api.TournamentOpsService().updatePlayer(playerId!, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        categoryLevel: values.categoryLevel,
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      void queryClient.invalidateQueries({ queryKey: ["player-home", playerId] });
      if (user) {
        loginSession({ user, player: updated });
      }
    },
  });

  return (
    <div className="space-y-5" data-testid="player-account-panel">
      <form
        className="space-y-4 rounded-xl border border-border bg-card p-4"
        onSubmit={handleSubmit((values) => saveMutation.mutateAsync(values))}
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName ? (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName ? (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" type="tel" {...register("phone")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoryLevel">Categoría oficial</Label>
          <select
            id="categoryLevel"
            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm"
            {...register("categoryLevel", { valueAsNumber: true })}
          >
            {CATEGORY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {formatCategoryLevel(level)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Es el nivel con el que te anotás a torneos. Los cambios quedan en el
            historial.
          </p>
        </div>

        {saveMutation.isError ? (
          <p className="text-xs text-destructive">
            No se pudo guardar. Probá de nuevo.
          </p>
        ) : null}
        {saveMutation.isSuccess && !isDirty ? (
          <p className="text-xs text-muted-foreground">Perfil actualizado.</p>
        ) : null}

        <Button
          type="submit"
          disabled={
            isSubmitting || saveMutation.isPending || !isValid || !isDirty
          }
        >
          {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Historial de categoría
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Recorrido de niveles para transparencia en torneos.
          </p>
        </div>
        <CategoryHistoryList entries={player.categoryHistory ?? []} />
      </section>
    </div>
  );
}
