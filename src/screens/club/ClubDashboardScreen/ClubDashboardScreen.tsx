import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Api from '@/api/Api'
import { useMockSession } from '@/app/MockSessionProvider'
import MatchCard from '@/components/tournaments/MatchCard'
import { buttonVariants } from '@/components/ui/button'
import { ROUTES } from '@/router/routes'
import { cn } from '@/lib/utils'

export default function ClubDashboardScreen() {
  const { clubId } = useMockSession()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', clubId],
    queryFn: () => Api.TournamentOpsService().getDashboard(clubId),
  })
  const { data: pairs = [] } = useQuery({
    queryKey: ['pairs', 'cat-1'],
    queryFn: () => Api.TournamentOpsService().listPairs('cat-1'),
  })
  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => Api.TournamentOpsService().listPlayers(),
  })

  const pairLabel = (id: string | null) => {
    if (!id) return 'Por definir'
    const pair = pairs.find((p) => p.id === id)
    if (!pair) return id
    const p1 = players.find((p) => p.id === pair.player1Id)?.displayName ?? '?'
    const p2 = players.find((p) => p.id === pair.player2Id)?.displayName ?? '?'
    return `${p1} / ${p2}`
  }

  if (isLoading || !data) {
    return <p className="text-muted-foreground">Cargando dashboard…</p>
  }

  return (
    <div className="space-y-6" data-testid="club-dashboard">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Qué está pasando ahora</p>
        </div>
        <Link to={ROUTES.club.tournamentNew} className={cn(buttonVariants())}>
          Nuevo torneo
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Inscritos" value={String(data.registeredPairs)} />
        <Stat label="En juego" value={String(data.liveMatches)} />
        <Stat label="Canchas" value={`${data.courtsInUse}/${data.courtsTotal}`} />
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-medium">Próximos partidos</h3>
        {data.upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay partidos programados todavía.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.upcoming.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                pairALabel={pairLabel(match.pairAId)}
                pairBLabel={pairLabel(match.pairBId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  )
}
