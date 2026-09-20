import type { IGeographyRepository } from "../repositories/GeographyRepository";

export class GeographyService {
  private readonly repository: IGeographyRepository;

  constructor(repository: IGeographyRepository) {
    this.repository = repository;
  }

  listProvinces() {
    return this.repository.listProvinces();
  }

  listMunicipalities(provinceId: number) {
    return this.repository.listMunicipalities(provinceId);
  }
}
