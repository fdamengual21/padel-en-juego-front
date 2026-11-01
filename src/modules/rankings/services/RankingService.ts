import type {
  IRankingRepository,
  PublicRankingListQuery,
  RankingStandingsQuery,
} from "../repositories/RankingRepository";
import type {
  CreateClubRankingRequest,
  RankingBannerDraft,
  UpdateClubRankingRequest,
} from "../types";

export class RankingService {
  private readonly repository: IRankingRepository;

  constructor(repository: IRankingRepository) {
    this.repository = repository;
  }

  listClub(scope?: "live" | "finished" | "all") {
    return this.repository.listClub(scope);
  }

  getClub(id: string) {
    return this.repository.getClub(id);
  }

  getClubStandings(circuitId: string, query?: RankingStandingsQuery) {
    return this.repository.getClubStandings(circuitId, query);
  }

  getPublicStandings(circuitId: string, query?: RankingStandingsQuery) {
    return this.repository.getPublicStandings(circuitId, query);
  }

  create(input: CreateClubRankingRequest) {
    return this.repository.create(input);
  }

  update(id: string, input: UpdateClubRankingRequest) {
    return this.repository.update(id, input);
  }

  listPublic(query?: PublicRankingListQuery) {
    return this.repository.listPublic(query);
  }

  listPublicByClub(clubId: string, scope?: "live" | "finished") {
    return this.repository.listPublicByClub(clubId, scope);
  }

  getPublic(id: string) {
    return this.repository.getPublic(id);
  }

  applyFlyer(id: string, banner: RankingBannerDraft) {
    return this.repository.applyFlyer(id, banner);
  }
}
