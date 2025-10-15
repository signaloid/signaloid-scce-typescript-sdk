import { AxiosInstance } from "axios";
import { KeyDetails, KeyRequest, ListKeysResponse } from "../types/keys";

export class KeysManager {
  constructor(private readonly client: AxiosInstance) {}

  public async list(): Promise<ListKeysResponse> {
    const response = await this.client.get("/keys");
    return response.data;
  }

  public async create(payload: KeyRequest): Promise<KeyDetails> {
    const response = await this.client.post("/keys", payload);
    return response.data;
  }

  public async delete(keyID: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/keys/${keyID}`);
    return response.data;
  }
}
