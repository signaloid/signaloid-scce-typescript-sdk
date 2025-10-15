import { AxiosInstance } from "axios";
import { SamplesResponse, SamplesQueryParams } from "../types/samples";

export class SamplesManager {
  constructor(private readonly client: AxiosInstance) {}

  public async getSamples(
    options?: SamplesQueryParams,
  ): Promise<SamplesResponse> {
    if (options?.taskID && options?.valueID) {
      const params: Record<string, string> = {};
      if (options.count) {
        params.count = options.count.toString();
      }

      const response = await this.client.get(
        `/tasks/${options.taskID}/values/${options.valueID}/samples`,
        { params },
      );
      return response.data;
    }
    throw new Error(
      "getSamples requires both taskID and valueID for Reference Core samples",
    );
  }

  public async getSamplesFromUx(
    uxPayload: string,
    count?: number,
  ): Promise<SamplesResponse> {
    const params: Record<string, string> = {};
    if (count) {
      params.count = count.toString();
    }

    const response = await this.client.post(
      "/samples",
      { payload: uxPayload },
      { params },
    );
    return response.data;
  }
}
