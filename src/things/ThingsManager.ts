import { AxiosInstance } from "axios";
import {
  ThingDetails,
  ThingPatchRequest,
  ListThingsResponse,
  ThingFilesResponse,
} from "../types/things";

export class ThingsManager {
  constructor(private readonly client: AxiosInstance) {}

  public async list(): Promise<ListThingsResponse> {
    const response = await this.client.get("/things");
    return response.data;
  }

  public async getOne(thingID: string): Promise<ThingDetails> {
    const response = await this.client.get(`/things/${thingID}`);
    return response.data;
  }

  public async update(
    thingID: string,
    payload: ThingPatchRequest,
  ): Promise<{ message: string }> {
    const response = await this.client.patch(`/things/${thingID}`, payload);
    return response.data;
  }

  public async getFiles(thingID: string): Promise<ThingFilesResponse> {
    const response = await this.client.get(`/things/${thingID}/files`);
    return response.data;
  }
}
