import axios, { AxiosInstance } from "axios";
import {
  CreateTaskResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  TaskDetail,
  TaskOutputs,
  OutputStream,
  CreateTaskRequest,
} from "../types/tasks";
import { AuthManager } from "../auth/AuthManager";
import { RealtimeClient } from "../realtime/RealtimeClient";
import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";
import { DatasourcesManager } from "../datasources/DatasourcesManager";
import { UsersManager } from "../users/UsersManager";

export class TasksManager {
  private plainAxios: AxiosInstance;

  constructor(
    private readonly client: AxiosInstance,
    private readonly realtime: RealtimeClient,
    private readonly auth: AuthManager,
    private readonly datasources: DatasourcesManager,
    private readonly users: UsersManager,
  ) {
    this.plainAxios = axios.create({
      timeout: 30000, // 30 seconds for file downloads
    });
  }

  public async createTask(
    buildID: string,
    payload: CreateTaskRequest,
    options?: { useSignaloidCloudStorage: boolean },
  ): Promise<CreateTaskResponse> {
    if (options?.useSignaloidCloudStorage) {
      const signaloidCloudStorage =
        await this.datasources.getSignaloidCloudStorage();
      payload = {
        ...payload,
        DataSources: [...(payload?.DataSources || []), signaloidCloudStorage],
      };
    }
    const response = await this.client.post(
      `/builds/${buildID}/tasks`,
      payload,
    );
    return response.data;
  }

  public async list(
    options?: ListTasksQueryParams,
  ): Promise<ListTasksResponse> {
    const params: Record<string, string> = {};
    if (options?.status) {
      params.status = options.status;
    }
    if (options?.startKey) {
      params.startKey = options.startKey;
    }
    if (options?.from) {
      params.from = options.from;
    }
    if (options?.to) {
      params.to = options.to;
    }

    const response = await this.client.get<ListTasksResponse>("/tasks", {
      params,
    });
    return response.data;
  }

  public async getOne(taskID: string): Promise<TaskDetail> {
    const response = await this.client.get(`/tasks/${taskID}`);
    return response.data;
  }

  public async deleteOne(taskID: string): Promise<void> {
    await this.client.delete(`/tasks/${taskID}`);
  }

  public async cancel(taskID: string): Promise<void> {
    await this.client.post(`/tasks/${taskID}/cancel`);
  }

  public async getStatus(taskID: string): Promise<string> {
    return (await this.getOne(taskID)).Status;
  }

  public async waitForTask(
    taskID: string,
    options: { timeoutSec?: number; userId?: string } = {},
  ): Promise<string> {
    const isAliveIntervalSec = 10;
    const completeStatus = ["Completed", "Cancelled", "Stopped"];
    const userId =
      options.userId ||
      (await this.auth.getUserId()) ||
      (await this.users.me()).UserID;
    const timeoutSec = options.timeoutSec ?? 60;

    // Subscription establishing can take up to 10sec.
    //  -> Therefore we will likely miss updates of quick tasks.
    // Since we can't make any assumptions we start checking in parallel (Promise.race())
    //  - If the channel is established and task is running likely everything will go fine (and fast)
    //  - If the task had finished we need to rely on the old .getStatus() to break out.
    // NOTE: there is an inherent *race condition*:
    //  1. getStatus() notices the task is still running
    //  2. While the channel is being established task finishes
    //  -> We don't get any updates, we get blocked and timeout
    // For several reasons updates might not come
    //  -> Therefore every N seconds we must check the state the old way.

    const channelPromise = this.realtime
      .channel(`task-status/${userId}`)
      .subscribe();

    const getTaskDoneStatus = () =>
      this.getStatus(taskID).then(
        (status) => (completeStatus.includes(status) && status) || null,
        () => null,
      );

    const taskAlreadyDonePromise = getTaskDoneStatus();
    const potentialEndState = await Promise.race([
      channelPromise,
      taskAlreadyDonePromise,
    ]);

    if (potentialEndState === "string") {
      // oops, task is finished. Unsubscribe and return
      let channel = await channelPromise.catch(() => {});
      channel?.close();
      return potentialEndState;
    }

    // Otherwise either (1) endState is null (still running/error) or (2) the channel finished first
    // Either way we need to immediately install handlers to not lose updates.
    // We can still check the result of taskAlreadyDonePromise after.
    let channel = await channelPromise;

    return new Promise((resolve, reject) => {
      let isDone = false;

      const timeout = setTimeout(async () => {
        if (isDone) return;
        isDone = true;
        cleanup();
        reject(
          new SdkError(ERROR_CODES.REALTIME_TIMEOUT, "Task waiting timeout"),
        );
      }, timeoutSec * 1000);

      const regularChecks = setInterval(async () => {
        if (isDone) return;
        const endState = await getTaskDoneStatus();
        if (endState) {
          setComplete(true, endState);
        }
      }, isAliveIntervalSec * 1000);

      const messageHandler = async (msg: any) => {
        const payload = (msg as any)?.data ?? (msg as any)?.event ?? msg;
        const incomingId = payload.taskId || payload.taskID;
        const incomingStatus = payload.status || payload.Status;
        if (incomingId !== taskID) {
          return;
        }
        if (completeStatus.includes(incomingStatus)) {
          await setComplete(true, incomingStatus);
        }
      };

      const errorHandler = async (err: any) => {
        await setComplete(false, err?.message || err);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(regularChecks);
        channel.close();
      };

      const setComplete = async (ok: boolean, msg: string) => {
        if (isDone) {
          return;
        }
        isDone = true;
        cleanup();
        if (ok) {
          resolve(msg);
        } else {
          reject(new SdkError(ERROR_CODES.API_SERVER_ERROR, msg));
        }
      };

      channel.on("message", messageHandler);
      channel.on("error", errorHandler);

      // Also setComplete() if the original promise succeeds
      taskAlreadyDonePromise.then((finishedState) => {
        if (finishedState != null) {
          setComplete(true, finishedState);
        }
      });
    });
  }

  public async getOutputURLs(taskID: string): Promise<TaskOutputs> {
    const response = await this.client.get(`/tasks/${taskID}/outputs`);
    return response.data;
  }

  /// Return the selected output to the user. The backend will serve cached data if available
  public async getOutput(
    taskID: string,
    outStream: OutputStream,
  ): Promise<string> {
    const response = await this.client.get(
      `/tasks/${taskID}/output/${outStream}`,
    );
    return response.data;
  }
}
