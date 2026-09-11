import { useQuery } from '@tanstack/react-query'
import Api from '@/api/Api'
import { useMockSession } from '@/app/MockSessionProvider'
import StatusBadge from '@/components/tournaments/StatusBadge'

export default function ClubCourtsScreen() {
  const { clubId } = useMockSession()
  const { data: courts = [] } = useQuery({
    queryKey: ['courts', clubId],
    queryFn: () => Api.TournamentOpsService().listCourts(clubId),
  })
  return (
    <div className="space-y-4" data-testid="club-courts">
      <h2 className="text-2xl font-semibold tracking-tight">Canchas</h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {courts.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">{c.name}</p>
            <div className="mt-2"><StatusBadge status={c.status} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
