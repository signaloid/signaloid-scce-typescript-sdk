import { AxiosInstance } from "axios";
import { HealthResponse } from "../types/health";

export class HealthManager {
  constructor(private readonly client: AxiosInstance) {}

  public async getOverallHealth(): Promise<HealthResponse> {
    const response = await this.client.get("/health");
    return response.data;
  }
}
