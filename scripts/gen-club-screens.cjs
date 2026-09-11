const fs = require("fs");
const path = require("path");
const root = process.cwd();
function write(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  console.log("W", rel);
}

write(
  "src/features/club/ClubDashboardScreen.tsx",
  `import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Api from '@/api/Api'
import { useMockSession } from '@/app/MockSessionProvider'
import MatchCard from '@/components/domain/MatchCard'
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
    return \`\${p1} / \${p2}\`
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
        <Stat label="Canchas" value={\`\${data.courtsInUse}/\${data.courtsTotal}\`} />
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
`,
);

write(
  "src/features/club/ClubTournamentsScreen.tsx",
  `import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Api from '@/api/Api'
import { useMockSession } from '@/app/MockSessionProvider'
import TournamentCard from '@/components/domain/TournamentCard'
import { buttonVariants } from '@/components/ui/button'
import { ROUTES } from '@/router/routes'
import { cn } from '@/lib/utils'

export default function ClubTournamentsScreen() {
  const { clubId } = useMockSession()
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments', clubId],
    queryFn: () => Api.TournamentService().list(clubId),
  })

  return (
    <div className="space-y-6" data-testid="club-tournaments">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Torneos</h2>
        <Link to={ROUTES.club.tournamentNew} className={cn(buttonVariants())}>Crear torneo</Link>
      </div>
      {isLoading ? <p>Cargando…</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {tournaments.map((t) => (
          <TournamentCard key={t.id} tournament={t} to={ROUTES.club.tournamentDetail(t.id)} />
        ))}
      </div>
    </div>
  )
}
`,
);

write(
  "src/features/club/ClubPlayersScreen.tsx",
  `import { useQuery } from '@tanstack/react-query'
import Api from '@/api/Api'

export default function ClubPlayersScreen() {
  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => Api.TournamentOpsService().listPlayers(),
  })
  return (
    <div className="space-y-4" data-testid="club-players">
      <h2 className="text-2xl font-semibold tracking-tight">Jugadores</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {players.map((p) => (
          <li key={p.id} className="px-4 py-3 flex justify-between gap-3">
            <span className="font-medium">{p.displayName}</span>
            <span className="text-sm text-muted-foreground">{p.phone}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
`,
);

write(
  "src/features/club/ClubCourtsScreen.tsx",
  `import { useQuery } from '@tanstack/react-query'
import Api from '@/api/Api'
import { useMockSession } from '@/app/MockSessionProvider'
import StatusBadge from '@/components/domain/StatusBadge'

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
`,
);

write(
  "src/features/club/ClubScheduleScreen.tsx",
  `import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
            ? \` · ⚠ \${mutation.data.suboptimalCount} subóptimos\`
            : ''}
          {mutation.data.pendingCount > 0
            ? \` · \${mutation.data.pendingCount} pendientes\`
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
`,
);

console.log("club screens ok");
