import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Api from "@/api/Api";
import RankingForm, {
  type RankingFormValues,
} from "@/screens/club/components/RankingForm";
import type { RankingBannerDraft } from "@/modules/rankings";
import { ROUTES } from "@/router/routes";
import { toastError, toastSuccess } from "@/lib/toast";

export default function ClubRankingCreateScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: { values: RankingFormValues; banner: RankingBannerDraft }) => {
      const { values, banner } = input;
      const circuit = await Api.RankingService().create({
        name: values.name.trim(),
        description: values.description.trim() || null,
        weekday: values.weekday,
        weekCount: values.weekCount,
        firstDate: values.firstDate,
        gender: values.categoryGender,
        kind: values.categoryKind,
        level: values.categoryKind === "level" ? values.categoryLevel : null,
        sumaTarget: values.categoryKind === "suma" ? values.sumaTarget : null,
        categoryName: values.categoryName,
        format: values.format,
        preset: values.matchPlayType,
        goldenPoint: values.equalsResolution === "goldenPoint",
        setsToWin: values.setsToWin,
        tiebreakPoints: values.tiebreakPoints,
        defaultMaxPairs: values.maxPairs,
        dailyStartTime: values.dailyStartTime || null,
        registrationFee: values.registrationFee,
        prizes: values.prizes
          .filter((item) => item.label.trim())
          .map((item) => ({ place: item.place, label: item.label.trim() })),
      });
      await Api.RankingService().applyFlyer(circuit.id, banner);
      return circuit;
    },
    onSuccess: (circuit) => {
      toastSuccess("Ranking creado");
      void qc.invalidateQueries({ queryKey: ["club-rankings"] });
      void navigate(ROUTES.club.rankingDetail(circuit.id));
    },
    onError: (err: Error) => {
      toastError("No se pudo crear el ranking", err.message);
    },
  });

  return (
    <div className="space-y-4" data-testid="ranking-create">
      <h2 className="text-2xl font-semibold tracking-tight">Nuevo ranking</h2>
      <RankingForm
        submitLabel="Crear ranking"
        isSubmitting={mutation.isPending}
        onSubmit={async (values, banner) => {
          await mutation.mutateAsync({ values, banner });
        }}
      />
    </div>
  );
}
