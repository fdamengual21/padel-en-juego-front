import { ClubRepository, ClubService } from '@/modules/clubs'
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
