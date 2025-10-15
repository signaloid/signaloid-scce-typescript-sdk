import { AxiosInstance } from "axios";
import { SamplesQueryParams } from "../types";
import {
  PlotRequest,
  PlotResponse,
  SamplesUxRequest,
  SamplesUxResponse
} from "../types/plotting";

export class PlottingManager {
  constructor(private readonly client: AxiosInstance) {}

  public async plot(payload: PlotRequest): Promise<PlotResponse> {
    const response = await this.client.post("/plot", payload);
    return response.data;
  }

  public async getSamples(
    payload: SamplesUxRequest,
    options?: SamplesQueryParams,
  ): Promise<SamplesUxResponse> {
    const params: Record<string, string> = {};
    if (options?.count) {
      params.count = options.count.toString();
    }

    const response = await this.client.post("/samples", payload, { params });
    return response.data;
  }
}
