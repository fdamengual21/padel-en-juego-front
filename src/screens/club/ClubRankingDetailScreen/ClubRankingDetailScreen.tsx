import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CircleAlert } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { usePermissions } from "@/authorization";
import { PERMISSION_CLUB_TOURNAMENTS_WRITE } from "@/authorization/permissionCodes";
import { EmptyState } from "@/components/EmptyState";
import RankingDetailView, { type RankingDetailTab } from "@/components/rankings/RankingDetailView";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as RankingDetailTab | null;
  const activeTab: RankingDetailTab = tabParam && TABS.includes(tabParam) ? tabParam : "ranking";

  const query = useQuery({
    queryKey: ["club-ranking", clubId, circuitId],
    queryFn: () => Api.RankingService().getClub(circuitId),
    enabled: Boolean(clubId && circuitId),
  });
  const circuit = query.data;

  const save = useMutation({
    mutationFn: async ({
      values,
      banner,
    }: {
      values: RankingFormValues;
      banner: RankingBannerDraft;
    }) => {
      await Api.RankingService().update(circuitId, {
        name: values.name.trim(),
        description: values.description.trim() || null,
        dailyStartTime: values.dailyStartTime || null,
        registrationFee: values.registrationFee,
        prizes: values.prizes.filter((item) => item.label.trim()),
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
              submitLabel="Guardar"
              isSubmitting={save.isPending}
              bannerUrl={circuit.flyerUrl}
              initialValues={circuitToRankingFormValues(circuit)}
              onSubmit={(values, banner) => save.mutateAsync({ values, banner })}
            />
          ) : undefined
        }
      />
    </div>
  );
}
