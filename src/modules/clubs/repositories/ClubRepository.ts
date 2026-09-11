import { coreApi } from '@/config/coreApiClient'
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
