import { AxiosInstance } from "axios";
import {
  ListThingsResponse,
  ThingDetails,
  ThingFilesResponse,
  ThingPatchRequest,
} from "../types/things";

type RawListThingsResponse = {
  user_id: string;
  thing_ids: string[];
  thing_count: number;
};

type RawThingFilesResponse = {
  user_id: string;
  thing_id: string;
  items: Array<{ file: string; updated_at: number }>;
};

export class ThingsManager {
  constructor(private readonly client: AxiosInstance) {}

  public async list(): Promise<ListThingsResponse> {
    const response = await this.client.get<RawListThingsResponse>("/things");
    return {
      UserID: response.data.user_id,
      ThingIDs: response.data.thing_ids,
      ThingCount: response.data.thing_count,
    };
  }

  public async getOne(thingID: string): Promise<ThingDetails> {
    const response = await this.client.get(`/things/${thingID}`);
    return response.data;
  }

  public async update(
    thingID: string,
    payload: ThingPatchRequest,
  ): Promise<{ Message: string }> {
    const response = await this.client.patch<{ message: string }>(
      `/things/${thingID}`,
      payload,
    );
    return { Message: response.data.message };
  }

  public async getFiles(thingID: string): Promise<ThingFilesResponse> {
    const response = await this.client.get<RawThingFilesResponse>(
      `/things/${thingID}/files`,
    );
    return {
      UserID: response.data.user_id,
      ThingID: response.data.thing_id,
      Items: response.data.items.map((item) => ({
        File: item.file,
        UpdatedAt: item.updated_at,
      })),
    };
  }
}
