import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { ApiEnvelope } from "@/lib/apiClient";
import type { CurrentLegalDocuments } from "../types";

export interface ILegalRepository {
  getCurrent(): Promise<CurrentLegalDocuments>;
}

export class LegalRepository implements ILegalRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async getCurrent() {
    const response = await this.axiosInstance.get<ApiEnvelope<CurrentLegalDocuments>>(
      "/legal/current",
    );
    return readData(response);
  }
}
