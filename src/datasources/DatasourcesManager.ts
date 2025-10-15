import { AuthManager } from "../auth/AuthManager";
import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";
import { TaskDataSource } from "../types";
import { UsersManager } from "../users/UsersManager";

export class DatasourcesManager {
  constructor(
    private readonly auth: AuthManager,
    private readonly users: UsersManager,
  ) {}

  public async getSignaloidCloudStorage(): Promise<TaskDataSource> {
    let userId: string | undefined = await this.auth
      .getUserId()
      .catch(() => undefined);
    if (!userId) {
      userId = (await this.users.me()).UserID;
    }

    return {
      ResourceID: `signaloid-cloud-storage:/${userId}`,
      ResourceType: "SignaloidCloudStorage",
    };
  }
}
