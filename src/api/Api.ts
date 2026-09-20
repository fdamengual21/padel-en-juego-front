import axiosInstance from "@/config/axiosInstance";
import { AuthRepository, AuthService } from '@/modules/auth'
import { ClubRepository, ClubService } from '@/modules/clubs'
import { CourtRepository, CourtService } from '@/modules/courts'
import { GeographyRepository, GeographyService } from '@/modules/geography'
import { LegalRepository, LegalService } from '@/modules/legal'
import { SexRepository, SexService } from '@/modules/sexes'
import { TournamentRepository, TournamentService } from '@/modules/tournaments'
import { TournamentOpsRepository, TournamentOpsService } from '@/modules/tournament-ops'
import { UserRepository, UserService } from '@/modules/users'

let clubService: ClubService | null = null
let courtService: CourtService | null = null
let tournamentService: TournamentService | null = null
let tournamentOpsService: TournamentOpsService | null = null
let authService: AuthService | null = null
let geographyService: GeographyService | null = null
let legalService: LegalService | null = null
let sexService: SexService | null = null
let userService: UserService | null = null

const Api = {
  ClubService() {
    if (!clubService) clubService = new ClubService(new ClubRepository(axiosInstance))
    return clubService
  },
  CourtService() {
    if (!courtService) courtService = new CourtService(new CourtRepository(axiosInstance))
    return courtService
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
  AuthService() {
    if (!authService) authService = new AuthService(new AuthRepository(axiosInstance))
    return authService
  },
  GeographyService() {
    if (!geographyService) {
      geographyService = new GeographyService(new GeographyRepository(axiosInstance))
    }
    return geographyService
  },
  LegalService() {
    if (!legalService) {
      legalService = new LegalService(new LegalRepository(axiosInstance))
    }
    return legalService
  },
  SexService() {
    if (!sexService) {
      sexService = new SexService(new SexRepository(axiosInstance))
    }
    return sexService
  },
  UserService() {
    if (!userService) {
      userService = new UserService(new UserRepository(axiosInstance))
    }
    return userService
  },
}

export default Api
