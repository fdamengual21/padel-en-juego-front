import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { ApiEnvelope } from "@/lib/apiClient";
import type { Sex } from "../types";

export interface ISexRepository {
  list(): Promise<Sex[]>;
}

export class SexRepository implements ISexRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async list() {
    const response = await this.axiosInstance.get<ApiEnvelope<Sex[]>>("/sexes");
    return readData(response) ?? [];
  }
}
