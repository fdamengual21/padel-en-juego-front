import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import TournamentForm from "@/screens/club/components/TournamentForm";
import {
  buildMatchRulesFromForm,
  type TournamentFormValues,
} from "@/modules/tournaments/types";
import { createId } from "@core-api";
import { ROUTES } from "@/router/routes";

export default function ClubTournamentCreateScreen() {
  const { clubId } = useMockSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

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
        status: "registrationOpen",
        format: values.format,
        registrationFee: values.registrationFee,
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
        qualifyPerGroup: values.qualifyPerGroup,
        pairsPerGroup: values.pairsPerGroup,
        groupCount: null,
      });
      await Api.TournamentOpsService().syncCategoryStructure(category.id);
      return tournament;
    },
    onSuccess: (tournament) => {
      void qc.invalidateQueries({ queryKey: ["tournaments"] });
      void navigate(ROUTES.club.tournamentDetail(tournament.id));
    },
  });

  return (
    <div className="space-y-4" data-testid="tournament-wizard">
      <h2 className="text-2xl font-semibold tracking-tight">Crear torneo</h2>
      <TournamentForm
        submitLabel="Crear torneo"
        isSubmitting={mutation.isPending}
        onSubmit={async (values) => {
          await mutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
