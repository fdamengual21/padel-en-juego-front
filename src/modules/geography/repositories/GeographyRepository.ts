import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { ApiEnvelope } from "@/lib/apiClient";
import type { Municipality, Province } from "../types";

export interface IGeographyRepository {
  listProvinces(): Promise<Province[]>;
  listMunicipalities(provinceId: number): Promise<Municipality[]>;
}

export class GeographyRepository implements IGeographyRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async listProvinces() {
    const response = await this.axiosInstance.get<ApiEnvelope<Province[]>>(
      "/geography/provinces",
    );
    return readData(response) ?? [];
  }

  async listMunicipalities(provinceId: number) {
    const response = await this.axiosInstance.get<ApiEnvelope<Municipality[]>>(
      `/geography/provinces/${provinceId}/municipalities`,
    );
    return readData(response) ?? [];
  }
}
