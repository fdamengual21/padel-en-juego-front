import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CircleAlert } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { usePermissions } from "@/authorization";
import { PERMISSION_CLUB_TOURNAMENTS_WRITE } from "@/authorization/permissionCodes";
import { EmptyState } from "@/components/EmptyState";
import RankingDetailView, { type RankingDetailTab } from "@/components/rankings/RankingDetailView";
import { Button } from "@/components/ui/button";
import WarningDialog from "@/components/ui/warning-dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import type { RankingBannerDraft } from "@/modules/rankings";
import RankingForm, {
  circuitToRankingFormValues,
  type RankingFormValues,
} from "@/screens/club/components/RankingForm";
import { ROUTES } from "@/router/routes";

const TABS: RankingDetailTab[] = ["ranking", "fechas", "config"];

export default function ClubRankingDetailScreen() {
  const { circuitId = "" } = useParams();
  const { clubId } = useMockSession();
  const { can } = usePermissions();
  const canEdit = can(PERMISSION_CLUB_TOURNAMENTS_WRITE);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as RankingDetailTab | null;
  const activeTab: RankingDetailTab = tabParam && TABS.includes(tabParam) ? tabParam : "ranking";

  const query = useQuery({
    queryKey: ["club-ranking", clubId, circuitId],
    queryFn: () => Api.RankingService().getClub(circuitId),
    enabled: Boolean(clubId && circuitId),
  });
  const circuit = query.data;
  const [pendingShrink, setPendingShrink] = useState<SaveInput | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const canEditStructure = circuit?.status === "scheduled";
  const droppedWeeks = useMemo(() => {
    if (!circuit || !pendingShrink) return [];
    return (circuit.events ?? [])
      .map((event) => event.weekIndex)
      .filter((week): week is number => week != null && week > pendingShrink.values.weekCount)
      .sort((a, b) => a - b);
  }, [circuit, pendingShrink]);

  const save = useMutation({
    mutationFn: async ({ values, banner }: SaveInput) => {
      await Api.RankingService().update(circuitId, {
        name: values.name.trim(),
        description: values.description.trim() || null,
        dailyStartTime: values.dailyStartTime || null,
        registrationFee: values.registrationFee,
        prizes: values.prizes.filter((item) => item.label.trim()),
        ...(canEditStructure
          ? {
              weekCount: values.weekCount,
              weekday: values.weekday,
              firstDate: values.firstDate,
              gender: values.categoryGender,
              kind: values.categoryKind,
              level: values.categoryKind === "level" ? values.categoryLevel : null,
              sumaTarget: values.categoryKind === "suma" ? values.sumaTarget : null,
              categoryName: values.categoryName.trim(),
              defaultMaxPairs: values.maxPairs,
            }
          : {}),
      });
      if (banner.file || banner.remove) {
        await Api.RankingService().applyFlyer(circuitId, banner);
      }
    },
    onSuccess: () => {
      toastSuccess("Ranking guardado");
      void qc.invalidateQueries({ queryKey: ["club-ranking", clubId, circuitId] });
      void qc.invalidateQueries({ queryKey: ["club-rankings"] });
    },
    onError: (err: Error) => toastError("No se pudo guardar el ranking", err.message),
  });

  const cancel = useMutation({
    mutationFn: () => Api.RankingService().cancel(circuitId),
    onSuccess: () => {
      toastSuccess("Ranking cancelado");
      setCancelOpen(false);
      void qc.invalidateQueries({ queryKey: ["club-ranking", clubId, circuitId] });
      void qc.invalidateQueries({ queryKey: ["club-rankings"] });
      navigate(ROUTES.club.ranking);
    },
    onError: (err: Error) => toastError("No se pudo cancelar el ranking", err.message),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando ranking…</p>;
  }
  if (query.isError || !circuit) {
    return (
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title="No se pudo cargar el ranking"
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="club-ranking-detail">
      <Link
        to={ROUTES.club.ranking}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Rankings
      </Link>

      <RankingDetailView
        circuit={circuit}
        standingsSource="club"
        tournamentTo={(id) => ROUTES.club.rankingEvent(circuitId, id)}
        activeTab={activeTab}
        onTabChange={(tab) => {
          const next = new URLSearchParams(searchParams);
          if (tab === "ranking") next.delete("tab");
          else next.set("tab", tab);
          setSearchParams(next, { replace: true });
        }}
        configTab={
          canEdit && circuit.status !== "finished" && circuit.status !== "cancelled" ? (
            <RankingForm
              key={circuit.updatedAt}
              mode="edit"
              canEditStructure={canEditStructure}
              submitLabel="Guardar"
              isSubmitting={save.isPending}
              bannerUrl={circuit.flyerUrl}
              initialValues={circuitToRankingFormValues(circuit)}
              secondaryAction={
                <Button
                  type="button"
                  variant="destructive"
                  disabled={save.isPending || cancel.isPending}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancelar ranking
                </Button>
              }
              onSubmit={(values, banner) => {
                if (canEditStructure && values.weekCount < circuit.weekCount) {
                  setPendingShrink({ values, banner });
                  return;
                }
                save.mutate({ values, banner });
              }}
            />
          ) : undefined
        }
      />

      <WarningDialog
        open={pendingShrink != null}
        onOpenChange={(open) => {
          if (!open && !save.isPending) setPendingShrink(null);
        }}
        title={droppedWeeks.length === 1 ? "Quitar 1 fecha" : `Quitar ${droppedWeeks.length} fechas`}
        description={`Se van a borrar ${droppedWeeksLabel(droppedWeeks)}. Las parejas anotadas en esas fechas quedan dadas de baja.`}
        confirmLabel="Quitar y guardar"
        cancelLabel="Volver"
        confirmVariant="destructive"
        isConfirming={save.isPending}
        onConfirm={() => {
          if (!pendingShrink) return;
          save.mutate(pendingShrink, { onSettled: () => setPendingShrink(null) });
        }}
      />

      <WarningDialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!cancel.isPending) setCancelOpen(open);
        }}
        title="Cancelar ranking"
        description={
          circuit.status === "scheduled"
            ? "Se cancelan todas las fechas y las parejas anotadas quedan afuera. No se puede deshacer."
            : "Las fechas que faltan jugar se cancelan y el ranking deja de verse en la app. No se puede deshacer."
        }
        confirmLabel="Cancelar ranking"
        cancelLabel="Volver"
        confirmVariant="destructive"
        isConfirming={cancel.isPending}
        onConfirm={() => cancel.mutate()}
      />
    </div>
  );
}

interface SaveInput {
  values: RankingFormValues;
  banner: RankingBannerDraft;
}

function droppedWeeksLabel(weeks: number[]): string {
  if (weeks.length === 0) return "las últimas fechas";
  if (weeks.length === 1) return `la fecha ${weeks[0]}`;
  const head = weeks.slice(0, -1).join(", ");
  return `las fechas ${head} y ${weeks[weeks.length - 1]}`;
}
