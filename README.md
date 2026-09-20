# Padel en juego

App de gestión de torneos y club de pádel (React + Vite + TypeScript).

## Scripts

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

## Feature flags

En `.env` / `.env.example` (`VITE_FEATURE_*`). Default en código: todas `true` salvo Ranking.

```bash
VITE_FEATURE_RANKING=false
VITE_FEATURE_TOURNAMENTS=true
```

Uso: `FeatureGuard` / `ConditionGuard` en UI, `RequireFeature` en rutas, `filterByFeature` en nav.
