import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Api from '@/api/Api'
import { Button } from '@/components/ui/button'

export default function ClubScheduleScreen() {
  const qc = useQueryClient()
  const { data: matches = [] } = useQuery({
    queryKey: ['matches', 'cat-1'],
    queryFn: () => Api.TournamentOpsService().listMatches('cat-1'),
  })
  const scheduled = matches
    .filter((m) => m.scheduledAt)
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))

  const mutation = useMutation({
    mutationFn: () => Api.TournamentOpsService().scheduleCategory('cat-1'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['matches', 'cat-1'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return (
    <div className="space-y-4" data-testid="club-schedule">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Agenda</h2>
          <p className="text-sm text-muted-foreground">Programación por horario</p>
        </div>
        <Button
          data-testid="auto-schedule-btn"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          Programar automáticamente
        </Button>
      </div>
      {mutation.data ? (
        <p className="text-sm text-muted-foreground" data-testid="schedule-summary">
          ✓ {mutation.data.scheduledCount} partidos programados
          {mutation.data.suboptimalCount > 0
            ? ` · ⚠ ${mutation.data.suboptimalCount} subóptimos`
            : ''}
          {mutation.data.pendingCount > 0
            ? ` · ${mutation.data.pendingCount} pendientes`
            : ''}
        </p>
      ) : null}
      <ul className="space-y-2">
        {scheduled.map((m) => (
          <li key={m.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
            {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('es-AR') : 'Sin horario'}
            {' · '}
            {m.courtId ?? 'Sin cancha'} · {m.phase}
          </li>
        ))}
        {scheduled.length === 0 ? (
          <li className="text-sm text-muted-foreground">Todavía no hay partidos en agenda.</li>
        ) : null}
      </ul>
    </div>
  )
}
