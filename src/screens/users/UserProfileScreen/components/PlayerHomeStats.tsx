interface PlayerHomeStatsProps {
  matchesPlayed: number;
  tournamentsCount: number;
  tournamentsWon: number;
  matchesWon: number;
  matchesLost: number;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default function PlayerHomeStats({
  matchesPlayed,
  tournamentsCount,
  tournamentsWon,
  matchesWon,
  matchesLost,
}: PlayerHomeStatsProps) {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      data-testid="player-home-stats"
    >
      <StatCard label="Partidos jugados" value={matchesPlayed} />
      <StatCard label="Torneos jugados" value={tournamentsCount} />
      <StatCard
        label="Torneos ganados"
        value={tournamentsWon}
        hint={`de ${tournamentsCount}`}
      />
      <StatCard
        label="Partidos"
        value={`${matchesWon}–${matchesLost}`}
        hint="Ganados – perdidos"
      />
    </div>
  );
}
