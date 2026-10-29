import { toPublicTournamentPage } from "../helpers/toPublicTournamentPage";
import type {
  ClubTournamentListQuery,
  ITournamentRepository,
  PublicTournamentListQuery,
} from "../repositories/TournamentRepository";
import type {
  CreateTournamentRequest,
  PublicTournamentPage,
  Tournament,
  TournamentBannerDraft,
} from "../types";

export class TournamentService {
  private readonly repository: ITournamentRepository;

  constructor(repository: ITournamentRepository) {
    this.repository = repository;
  }

  list(query?: ClubTournamentListQuery) {
    return this.repository.list(query);
  }

  listPublic(query?: PublicTournamentListQuery) {
    return this.repository.listPublic(query);
  }

  getById(id: string) {
    return this.repository.getById(id);
  }

  getPublic(id: string) {
    return this.repository.getPublic(id);
  }

  async getPublicView(id: string, categoryId?: string): Promise<PublicTournamentPage> {
    const dto = await this.repository.getPublicView(id, categoryId);
    return toPublicTournamentPage(dto);
  }

  create(input: CreateTournamentRequest) {
    return this.repository.create(input);
  }

  update(
    id: string,
    patch: Partial<Omit<Tournament, "id" | "createdAt" | "clubId">>,
  ) {
    return this.repository.update(id, patch);
  }

  uploadBanner(id: string, file: File) {
    return this.repository.uploadBanner(id, file);
  }

  deleteBanner(id: string) {
    return this.repository.deleteBanner(id);
  }

  async applyBanner(id: string, banner: TournamentBannerDraft) {
    if (banner.file) return this.repository.uploadBanner(id, banner.file);
    if (banner.remove) return this.repository.deleteBanner(id);
  }
}
