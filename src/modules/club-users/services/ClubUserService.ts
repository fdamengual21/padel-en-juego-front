import type { IClubUserRepository } from "../repositories/ClubUserRepository";
import type {
  AssignClubStaffRoleInput,
  ClubStaffStatusFilter,
  InviteClubStaffInput,
} from "../types";

export class ClubUserService {
  private readonly repository: IClubUserRepository;

  constructor(repository: IClubUserRepository) {
    this.repository = repository;
  }

  list(status: ClubStaffStatusFilter) {
    return this.repository.list(status);
  }

  listRoles() {
    return this.repository.listRoles();
  }

  searchCandidates(query: string) {
    return this.repository.searchCandidates(query);
  }

  getCandidate(userId: string) {
    return this.repository.getCandidate(userId);
  }

  invite(input: InviteClubStaffInput) {
    return this.repository.invite(input);
  }

  assignRole(userId: string, input: AssignClubStaffRoleInput) {
    return this.repository.assignRole(userId, input);
  }

  deactivate(userId: string) {
    return this.repository.deactivate(userId);
  }

  reactivate(userId: string) {
    return this.repository.reactivate(userId);
  }
}
