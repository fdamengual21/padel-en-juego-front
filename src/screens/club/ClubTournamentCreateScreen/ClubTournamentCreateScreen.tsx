import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import TournamentForm from "@/screens/club/components/TournamentForm";
import {
  buildMatchRulesFromForm,
  phaseDayListFromMap,
  type TournamentFormValues,
} from "@/modules/tournaments/types";
import { createId } from "@/domain";
import { ROUTES } from "@/router/routes";
import { toastError, toastSuccess } from "@/lib/toast";

export default function ClubTournamentCreateScreen() {
  const { clubId } = useMockSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const courtsQuery = useQuery({
    queryKey: ["courts", clubId],
    queryFn: () => Api.CourtService().list(),
    enabled: Boolean(clubId),
  });
  const activeCourts = (courtsQuery.data ?? [])
    .filter((court) => court.status === "active")
    .map((court) => ({ id: court.id, name: court.name }));

  const mutation = useMutation({
    mutationFn: async (values: TournamentFormValues) => {
      const tournament = await Api.TournamentService().create({
        clubId,
        name: values.name,
        description: values.description || null,
        startDate: values.startDate,
        endDate: values.endDate,
        dailyStartTime: values.dailyStartTime,
        dailyEndTime: values.dailyEndTime,
        courtHoldStartTime:
          values.format === "QUALITY" && values.courtHoldCourtIds.length > 0
            ? values.courtHoldStartTime
            : undefined,
        courtHoldEndTime:
          values.format === "QUALITY" && values.courtHoldCourtIds.length > 0
            ? values.courtHoldEndTime
            : undefined,
        courtHoldCourtIds: values.format === "QUALITY" ? values.courtHoldCourtIds : [],
        status: "registrationOpen",
        format: values.format,
        registrationFee: values.registrationFee,
        phaseDays: phaseDayListFromMap(values.phaseDays),
      });
      const category = await Api.TournamentOpsService().createCategory({
        tournamentId: tournament.id,
        name: values.categoryName,
        gender: values.categoryGender,
        kind: values.categoryKind,
        level: values.categoryKind === "level" ? values.categoryLevel : null,
        sumaTarget: values.categoryKind === "suma" ? values.sumaTarget : null,
        maxPairs: values.maxPairs,
        circuitType: values.circuitType,
        status: "active",
      });
      await Api.TournamentOpsService().upsertRuleset({
        id: createId("rules"),
        tournamentCategoryId: category.id,
        preset: values.matchPlayType,
        matchRules: buildMatchRulesFromForm(values),
        tieBreakers: ["SET_DIFFERENCE", "POINTS", "HEAD_TO_HEAD", "GAME_DIFFERENCE"],
        groupCount: null,
      });
      await Api.TournamentOpsService().syncCategoryStructure(category.id);
      return tournament;
    },
    onSuccess: (tournament) => {
      toastSuccess("Torneo creado");
      void qc.invalidateQueries({ queryKey: ["tournaments"] });
      void navigate(ROUTES.club.tournamentDetail(tournament.id));
    },
    onError: (err: Error) => {
      toastError("No se pudo crear el torneo", err.message);
    },
  });

  return (
    <div className="space-y-4" data-testid="tournament-wizard">
      <h2 className="text-2xl font-semibold tracking-tight">Crear torneo</h2>
      <TournamentForm
        courts={activeCourts}
        submitLabel="Crear torneo"
        isSubmitting={mutation.isPending}
        onSubmit={async (values) => {
          await mutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
