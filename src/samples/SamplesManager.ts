import { AxiosInstance } from "axios";
import { SamplesResponse, SamplesQueryParams } from "../types/samples";

export class SamplesManager {
  constructor(private readonly client: AxiosInstance) {}

  public async getSamples(
    options: SamplesQueryParams,
  ): Promise<SamplesResponse> {
    const { taskID, valueID, count, continuationToken } = options || {};
    if (!taskID || !valueID) {
      throw new Error(
        "getSamples requires both taskID and valueID for samples",
      );
    }

    const params: Record<string, string> = {};
    if (count) params.count = String(count);
    if (continuationToken) params.continuationToken = continuationToken;

    const response = await this.client.get<SamplesResponse>(
      `/tasks/${encodeURIComponent(taskID)}/values/${encodeURIComponent(valueID)}/samples`,
      { params },
    );
    return response.data;
  }

  public async getSamplesFromUx(
    uxPayload: string,
    count?: number,
  ): Promise<SamplesResponse> {
    if (!uxPayload) {
      throw new Error("getSamplesFromUx requires a non-empty Ux payload");
    }
    const params: Record<string, string> = {};
    if (count) params.count = String(count);

    const response = await this.client.request<SamplesResponse>({
      method: "GET",
      url: "/samples",
      params,
      data: { payload: uxPayload },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  }
}
