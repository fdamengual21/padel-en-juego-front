import { coreApi } from '@/config/coreApiClient'
import type { Club, UpdateClubInput } from '../types'

export interface IClubRepository {
  list(): Promise<Club[]>
  getById(id: string): Promise<Club | null>
  update(id: string, patch: UpdateClubInput): Promise<Club>
}

export class ClubRepository implements IClubRepository {
  async list(): Promise<Club[]> {
    return coreApi().listClubs()
  }

  async getById(id: string): Promise<Club | null> {
    return coreApi().getClub(id)
  }

  async update(id: string, patch: UpdateClubInput): Promise<Club> {
    return coreApi().updateClub(id, patch)
  }
}
