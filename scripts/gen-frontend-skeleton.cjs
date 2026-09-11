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
  "vite.config.ts",
  `import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core-api': path.resolve(__dirname, './core-api'),
    },
  },
})
`,
);

write(
  "tsconfig.app.json",
  JSON.stringify(
    {
      compilerOptions: {
        tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
        target: "es2023",
        lib: ["ES2023", "DOM"],
        module: "esnext",
        types: ["vite/client"],
        allowArbitraryExtensions: true,
        skipLibCheck: true,
        ignoreDeprecations: "6.0",
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"],
          "@core-api": ["./core-api/index.ts"],
          "@core-api/*": ["./core-api/*"],
        },
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
        moduleDetection: "force",
        noEmit: true,
        jsx: "react-jsx",
        resolveJsonModule: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        erasableSyntaxOnly: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ["src", "core-api"],
    },
    null,
    2,
  ),
);

write(
  "src/types/index.ts",
  `export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string[]>
}

export interface Response<T> {
  data?: T | null
  success: boolean
  traceId: string | null
}
`,
);

write(
  "src/config/coreApiClient.ts",
  `import { getTournamentEngine } from '@core-api'

export function coreApi() {
  return getTournamentEngine()
}
`,
);

write(
  "src/modules/clubs/types/index.ts",
  `export type { Club } from '@core-api'
`,
);

write(
  "src/modules/clubs/repositories/ClubRepository.ts",
  `import { coreApi } from '@/config/coreApiClient'
import type { Club } from '../types'

export interface IClubRepository {
  list(): Promise<Club[]>
  getById(id: string): Promise<Club | null>
}

export class ClubRepository implements IClubRepository {
  async list(): Promise<Club[]> {
    return coreApi().listClubs()
  }

  async getById(id: string): Promise<Club | null> {
    return coreApi().getClub(id)
  }
}
`,
);

write(
  "src/modules/clubs/services/ClubService.ts",
  `import type { IClubRepository } from '../repositories/ClubRepository'

export class ClubService {
  constructor(private readonly repository: IClubRepository) {}

  list() {
    return this.repository.list()
  }

  getById(id: string) {
    return this.repository.getById(id)
  }
}
`,
);

write(
  "src/modules/clubs/index.ts",
  `export type { Club } from './types'
export { ClubRepository } from './repositories/ClubRepository'
export type { IClubRepository } from './repositories/ClubRepository'
export { ClubService } from './services/ClubService'
`,
);

write(
  "src/modules/tournaments/types/index.ts",
  `export type { Tournament, TournamentFormat, TournamentStatus } from '@core-api'

export interface CreateTournamentRequest {
  clubId: string
  name: string
  description: string | null
  startDate: string
  endDate: string | null
  status: import('@core-api').TournamentStatus
  format: import('@core-api').TournamentFormat
}
`,
);

write(
  "src/modules/tournaments/repositories/TournamentRepository.ts",
  `import { coreApi } from '@/config/coreApiClient'
import type { CreateTournamentRequest, Tournament } from '../types'

export interface ITournamentRepository {
  list(clubId?: string): Promise<Tournament[]>
  getById(id: string): Promise<Tournament | null>
  create(input: CreateTournamentRequest): Promise<Tournament>
}

export class TournamentRepository implements ITournamentRepository {
  list(clubId?: string) {
    return coreApi().listTournaments(clubId)
  }

  getById(id: string) {
    return coreApi().getTournament(id)
  }

  create(input: CreateTournamentRequest) {
    return coreApi().createTournament(input)
  }
}
`,
);

write(
  "src/modules/tournaments/services/TournamentService.ts",
  `import type { ITournamentRepository } from '../repositories/TournamentRepository'
import type { CreateTournamentRequest } from '../types'

export class TournamentService {
  constructor(private readonly repository: ITournamentRepository) {}

  list(clubId?: string) {
    return this.repository.list(clubId)
  }

  getById(id: string) {
    return this.repository.getById(id)
  }

  create(input: CreateTournamentRequest) {
    return this.repository.create(input)
  }
}
`,
);

write(
  "src/modules/tournaments/index.ts",
  `export type { Tournament, CreateTournamentRequest } from './types'
export { TournamentRepository } from './repositories/TournamentRepository'
export type { ITournamentRepository } from './repositories/TournamentRepository'
export { TournamentService } from './services/TournamentService'
`,
);

write(
  "src/modules/tournament-ops/types/index.ts",
  `export type {
  TournamentCategory,
  TournamentPair,
  TournamentRegistration,
  TournamentGroup,
  GroupStanding,
  Match,
  MatchSlot,
  TournamentRound,
  Court,
  ScheduleResult,
  GenerateGroupsConfig,
  MatchResultInput,
  Player,
  GroupConfigValidation,
  TournamentRuleset,
} from '@core-api'
`,
);

write(
  "src/modules/tournament-ops/repositories/TournamentOpsRepository.ts",
  `import { coreApi } from '@/config/coreApiClient'
import type { GenerateGroupsConfig, MatchResultInput } from '../types'

export interface ITournamentOpsRepository {
  listCategories(tournamentId: string): ReturnType<ReturnType<typeof coreApi>['listCategories']>
  createCategory: ReturnType<typeof coreApi>['createCategory']
  listPairs(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listPairs']>
  listRegistrations(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listRegistrations']>
  getRuleset(categoryId: string): ReturnType<ReturnType<typeof coreApi>['getRuleset']>
  listGroups(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listGroups']>
  listStandings(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listStandings']>
  listMatches(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listMatches']>
  getBracket(categoryId: string): ReturnType<ReturnType<typeof coreApi>['getBracket']>
  generateGroups(categoryId: string, config: GenerateGroupsConfig): ReturnType<ReturnType<typeof coreApi>['generateGroupsForCategory']>
  generateGroupMatches(categoryId: string): ReturnType<ReturnType<typeof coreApi>['generateGroupMatches']>
  submitMatchResult(matchId: string, input: MatchResultInput): ReturnType<ReturnType<typeof coreApi>['submitMatchResult']>
  generateBracket(categoryId: string): ReturnType<ReturnType<typeof coreApi>['generateBracket']>
  scheduleCategory(categoryId: string): ReturnType<ReturnType<typeof coreApi>['scheduleCategory']>
  listCourts(clubId: string): ReturnType<ReturnType<typeof coreApi>['listCourts']>
  getDashboard(clubId: string): ReturnType<ReturnType<typeof coreApi>['getDashboard']>
  getRanking(categoryId?: string): ReturnType<ReturnType<typeof coreApi>['getRanking']>
  getPlayerHome(playerId: string): ReturnType<ReturnType<typeof coreApi>['getPlayerHome']>
  listPlayers(): ReturnType<ReturnType<typeof coreApi>['listPlayers']>
}

export class TournamentOpsRepository implements ITournamentOpsRepository {
  listCategories(tournamentId: string) {
    return coreApi().listCategories(tournamentId)
  }

  createCategory: ITournamentOpsRepository['createCategory'] = (input) =>
    coreApi().createCategory(input)

  listPairs(categoryId: string) {
    return coreApi().listPairs(categoryId)
  }

  listRegistrations(categoryId: string) {
    return coreApi().listRegistrations(categoryId)
  }

  getRuleset(categoryId: string) {
    return coreApi().getRuleset(categoryId)
  }

  listGroups(categoryId: string) {
    return coreApi().listGroups(categoryId)
  }

  listStandings(categoryId: string) {
    return coreApi().listStandings(categoryId)
  }

  listMatches(categoryId: string) {
    return coreApi().listMatches(categoryId)
  }

  getBracket(categoryId: string) {
    return coreApi().getBracket(categoryId)
  }

  generateGroups(categoryId: string, config: GenerateGroupsConfig) {
    return coreApi().generateGroupsForCategory(categoryId, config)
  }

  generateGroupMatches(categoryId: string) {
    return coreApi().generateGroupMatches(categoryId)
  }

  submitMatchResult(matchId: string, input: MatchResultInput) {
    return coreApi().submitMatchResult(matchId, input)
  }

  generateBracket(categoryId: string) {
    return coreApi().generateBracket(categoryId)
  }

  scheduleCategory(categoryId: string) {
    return coreApi().scheduleCategory(categoryId)
  }

  listCourts(clubId: string) {
    return coreApi().listCourts(clubId)
  }

  getDashboard(clubId: string) {
    return coreApi().getDashboard(clubId)
  }

  getRanking(categoryId?: string) {
    return coreApi().getRanking(categoryId)
  }

  getPlayerHome(playerId: string) {
    return coreApi().getPlayerHome(playerId)
  }

  listPlayers() {
    return coreApi().listPlayers()
  }
}
`,
);

write(
  "src/modules/tournament-ops/services/TournamentOpsService.ts",
  `import type { ITournamentOpsRepository } from '../repositories/TournamentOpsRepository'
import type { GenerateGroupsConfig, MatchResultInput } from '../types'

export class TournamentOpsService {
  constructor(private readonly repository: ITournamentOpsRepository) {}

  listCategories(tournamentId: string) {
    return this.repository.listCategories(tournamentId)
  }

  createCategory(...args: Parameters<ITournamentOpsRepository['createCategory']>) {
    return this.repository.createCategory(...args)
  }

  listPairs(categoryId: string) {
    return this.repository.listPairs(categoryId)
  }

  listRegistrations(categoryId: string) {
    return this.repository.listRegistrations(categoryId)
  }

  getRuleset(categoryId: string) {
    return this.repository.getRuleset(categoryId)
  }

  listGroups(categoryId: string) {
    return this.repository.listGroups(categoryId)
  }

  listStandings(categoryId: string) {
    return this.repository.listStandings(categoryId)
  }

  listMatches(categoryId: string) {
    return this.repository.listMatches(categoryId)
  }

  getBracket(categoryId: string) {
    return this.repository.getBracket(categoryId)
  }

  generateGroups(categoryId: string, config: GenerateGroupsConfig) {
    return this.repository.generateGroups(categoryId, config)
  }

  generateGroupMatches(categoryId: string) {
    return this.repository.generateGroupMatches(categoryId)
  }

  submitMatchResult(matchId: string, input: MatchResultInput) {
    return this.repository.submitMatchResult(matchId, input)
  }

  generateBracket(categoryId: string) {
    return this.repository.generateBracket(categoryId)
  }

  scheduleCategory(categoryId: string) {
    return this.repository.scheduleCategory(categoryId)
  }

  listCourts(clubId: string) {
    return this.repository.listCourts(clubId)
  }

  getDashboard(clubId: string) {
    return this.repository.getDashboard(clubId)
  }

  getRanking(categoryId?: string) {
    return this.repository.getRanking(categoryId)
  }

  getPlayerHome(playerId: string) {
    return this.repository.getPlayerHome(playerId)
  }

  listPlayers() {
    return this.repository.listPlayers()
  }
}
`,
);

write(
  "src/modules/tournament-ops/index.ts",
  `export type * from './types'
export { TournamentOpsRepository } from './repositories/TournamentOpsRepository'
export type { ITournamentOpsRepository } from './repositories/TournamentOpsRepository'
export { TournamentOpsService } from './services/TournamentOpsService'
`,
);

write(
  "src/api/Api.ts",
  `import { ClubRepository, ClubService } from '@/modules/clubs'
import { TournamentRepository, TournamentService } from '@/modules/tournaments'
import { TournamentOpsRepository, TournamentOpsService } from '@/modules/tournament-ops'

let clubService: ClubService | null = null
let tournamentService: TournamentService | null = null
let tournamentOpsService: TournamentOpsService | null = null

const Api = {
  ClubService() {
    if (!clubService) clubService = new ClubService(new ClubRepository())
    return clubService
  },
  TournamentService() {
    if (!tournamentService) {
      tournamentService = new TournamentService(new TournamentRepository())
    }
    return tournamentService
  },
  TournamentOpsService() {
    if (!tournamentOpsService) {
      tournamentOpsService = new TournamentOpsService(new TournamentOpsRepository())
    }
    return tournamentOpsService
  },
}

export default Api
`,
);

console.log("done skeleton");
