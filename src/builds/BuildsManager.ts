import { AxiosInstance } from "axios";
import {
  CreateSourceBuildRequest,
  CreateSourceBuildResponse,
  CreateRepositoryBuildRequest,
  CreateRepositoryBuildResponse,
  ListBuildsResponse,
  BuildDetails,
  BuildVariablesResponse,
  BuildStatus,
  BuildBinaryResponse,
  BuildOutputs,
} from "../types/builds";
import { RealtimeClient } from "../realtime/RealtimeClient";
import { AuthManager } from "../auth/AuthManager";
import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";
import { UsersManager } from "../users/UsersManager";

export class BuildsManager {
  constructor(
    private readonly client: AxiosInstance,
    private readonly realtime: RealtimeClient,
    private readonly auth: AuthManager,
    private readonly users: UsersManager,
  ) {}

  public async createFromSourceCode(
    payload: CreateSourceBuildRequest,
  ): Promise<CreateSourceBuildResponse> {
    const response = await this.client.post("/sourcecode/builds", payload);
    return response.data;
  }

  public async createFromRepository(
    repositoryID: string,
    payload?: CreateRepositoryBuildRequest,
    discoverVars?: boolean,
  ): Promise<CreateRepositoryBuildResponse> {
    const url = `/repositories/${repositoryID}/builds`;
    const config = discoverVars
      ? { params: { DiscoverVariables: discoverVars } }
      : undefined;

    const response = await this.client.post<CreateRepositoryBuildResponse>(
      url,
      payload,
      config,
    );
    return response.data;
  }

  public async list(options?: {
    startKey?: string;
    from?: string;
    to?: string;
    status?: BuildStatus;
  }): Promise<ListBuildsResponse> {
    const params: Record<string, string> = {};
    if (options?.startKey) params.startKey = options.startKey;
    if (options?.from) params.from = options.from;
    if (options?.to) params.to = options.to;
    if (options?.status) params.status = options.status;

    const response = await this.client.get<ListBuildsResponse>("/builds", {
      params,
    });
    return response.data;
  }

  public async getOne(buildID: string): Promise<BuildDetails> {
    const response = await this.client.get(`/builds/${buildID}`);
    return response.data;
  }

  public async getStatus(buildID: string): Promise<string> {
    return (await this.getOne(buildID)).Status;
  }

  public async deleteOne(buildID: string): Promise<void> {
    await this.client.delete(`/builds/${buildID}`);
  }

  public async cancel(buildID: string): Promise<void> {
    await this.client.post(`/builds/${buildID}/cancel`);
  }

  public async getVariables(
    buildID: string,
    startKey?: string,
  ): Promise<BuildVariablesResponse> {
    const response = await this.client.get<BuildVariablesResponse>(
      `/builds/${buildID}/variables`,
      {
        params: startKey ? { startKey } : undefined,
      },
    );
    return response.data;
  }

  public async getOutputs(buildID: string): Promise<BuildOutputs> {
    const response = await this.client.get(`/builds/${buildID}/outputs`);
    return response.data;
  }

  public async getBinary(buildID: string): Promise<BuildBinaryResponse> {
    const response = await this.client.get(`/builds/${buildID}/binary`);
    return response.data;
  }

  public async waitForBuildAndGetOutputs(
    buildID: string,
    options: { timeoutMs?: number; userId?: string } = {},
  ): Promise<{ status: BuildStatus; outputs: any }> {
    const timeoutMs = options.timeoutMs ?? 60000;
    let userId: string | undefined = options.userId;

    if (!userId) {
      userId = await this.auth.getUserId().catch(() => undefined);
    }
    if (!userId) {
      userId = (await this.users.me()).UserID;
    }

    const channel = await this.realtime
      .channel(`build-status/${userId}`)
      .subscribe();
    let isResolved = false; // Prevent multiple resolutions

    try {
      return new Promise((resolve, reject) => {
        const cleanup = async () => {
          if (isResolved) return;
          isResolved = true;
          try {
            await channel.close();
          } catch (error) {
            // Silent cleanup failure
          }
        };

        const timeout = setTimeout(async () => {
          await cleanup();
          reject(
            new SdkError(
              ERROR_CODES.REALTIME_TIMEOUT,
              "Timed out waiting for build completion",
            ),
          );
        }, timeoutMs);

        channel.on("message", async (msg) => {
          try {
            const payload = (msg as any).data ?? (msg as any).event ?? msg;
            const incomingId = payload.buildId || payload.BuildID;
            const incomingStatus = payload.status || payload.Status;

            if (incomingId !== buildID) return;

            if (
              ["Completed", "Cancelled", "Stopped"].includes(incomingStatus)
            ) {
              if (isResolved) return;

              clearTimeout(timeout);
              await cleanup();

              try {
                const outputs = await this.getOutputs(buildID);
                resolve({ status: incomingStatus, outputs });
              } catch (outputError) {
                reject(outputError);
              }
            }
          } catch (err) {
            if (isResolved) return;
            clearTimeout(timeout);
            await cleanup();
            reject(err);
          }
        });

        channel.on("error", async (err) => {
          if (isResolved) return;
          clearTimeout(timeout);
          await cleanup();
          reject(err);
        });
      });
    } catch (subscribeError) {
      // If subscription fails, still try to clean up
      try {
        channel.close();
      } catch {
        // Silent cleanup failure
      }
      throw subscribeError;
    }
  }

  public async waitForBuild(
    buildID: string,
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
    //  - If the channel is established and build is running likely everything will go fine (and fast)
    //  - If the build had finished we need to rely on the old .getStatus() to break out.
    // NOTE: there is an inherent *race condition*:
    //  1. getStatus() notices the build is still running
    //  2. While the channel is being established build finishes
    //  -> We don't get any updates, we get blocked and timeout
    // For several reasons updates might not come
    //  -> Therefore every N seconds we must check the state the old way.

    const channelPromise = this.realtime
      .channel(`build-status/${userId}`)
      .subscribe();

    const getBuildDoneStatus = () =>
      this.getStatus(buildID).then(
        (status) => (completeStatus.includes(status) && status) || null,
        () => null,
      );

    const buildAlreadyDonePromise = getBuildDoneStatus();
    const potentialEndState = await Promise.race([
      channelPromise,
      buildAlreadyDonePromise,
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
          new SdkError(ERROR_CODES.REALTIME_TIMEOUT, "Build waiting timeout"),
        );
      }, timeoutSec * 1000);

      const regularChecks = setInterval(async () => {
        if (isDone) return;
        const endState = await getBuildDoneStatus();
        if (endState) {
          setComplete(true, endState);
        }
      }, isAliveIntervalSec * 1000);

      const messageHandler = async (msg: any) => {
        const payload = (msg as any)?.data ?? (msg as any)?.event ?? msg;
        const incomingId = payload.taskId || payload.taskID;
        const incomingStatus = payload.status || payload.Status;
        if (incomingId !== buildID) {
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
      buildAlreadyDonePromise.then((finishedState) => {
        if (finishedState != null) {
          setComplete(true, finishedState);
        }
      });
    });
  }
}
