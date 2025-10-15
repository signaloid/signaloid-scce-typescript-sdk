import { BuildsManager } from "../builds/BuildsManager";
import { createClient } from "../client/createClient";
import { SignaloidClient } from "../client/SignaloidClient";
import { TasksManager } from "../tasks/TasksManger";
import { OutputStream } from "../types/tasks";

describe("TasksManager", () => {
  let sdk: SignaloidClient;
  let tasksManager: TasksManager;
  let buildsManager: BuildsManager;
  let userId: string;

  beforeAll(async () => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    const userIdEnv = process.env.SIGNALOID_USER_ID;
    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }
    if (!userIdEnv) {
      throw new Error("Missing SIGNALOID_USER_ID environment variable");
    }

    sdk = createClient({ method: "apiKey", key: apiKey });
    userId = userIdEnv;
    tasksManager = sdk.tasks;
    buildsManager = sdk.builds;
    await sdk.realtime.connect();
  });

  afterAll(async () => {
    try {
      if (sdk?.realtime) {
        await sdk.realtime.close({ force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it("lists tasks", async () => {
    const response = await tasksManager.list();

    expect(response.Tasks).toBeInstanceOf(Array);
    expect(typeof response.Count).toBe("number");
    expect(response.UserID).toBeDefined();
  });

  it("lists tasks with status filter", async () => {
    const response = await tasksManager.list({ status: "Completed" });

    expect(response.Tasks).toBeInstanceOf(Array);
    // All returned tasks should be completed
    response.Tasks.forEach((task) => {
      expect(task.Status).toBe("Completed");
    });
  });

  it("gets task details", async () => {
    const tasks = await tasksManager.list();
    if (tasks.Tasks.length === 0) {
      console.warn("No tasks available for testing");
      return;
    }

    const taskId = tasks.Tasks[0].TaskID;
    const task = await tasksManager.getOne(taskId);

    expect(task.TaskID).toBe(taskId);
    expect(task.BuildID).toBeDefined();
    expect(task.Status).toBeDefined();
    expect(task.DataSources).toBeInstanceOf(Array);
  });

  it("gets task outputs", async () => {
    const completed = await tasksManager.list({ status: "Completed" });
    if (completed.Tasks.length === 0) {
      console.warn("No completed tasks available for testing");
      return;
    }

    const taskId = completed.Tasks[0].TaskID;
    const stdout = await tasksManager.getOutput(taskId, OutputStream.Stdout);

    expect(stdout).toBeDefined();
    expect(typeof stdout).toBe("string");
  });

  it("Launch a task and wait for completion", async () => {
    const builds = await buildsManager.list();
    if (builds.Builds.length === 0) {
      console.warn("No builds available for testing");
      return;
    }

    const buildId = builds.Builds[0].BuildID;
    const response = await tasksManager.createTask(buildId, {});
    const finalStatus = await tasksManager.waitForTask(response.TaskID, {
      userId: userId,
      timeoutSec: 20,
    });

    expect(["Completed", "Cancelled", "Stopped"]).toContain(finalStatus);

    // Even when the task finished, waitForTask should return fast with the last status
    const lateWaitOutput = await tasksManager.waitForTask(response.TaskID, {
      userId: userId,
    });
    expect(["Completed", "Cancelled", "Stopped"]).toContain(lateWaitOutput);
  }, 150000);

  it("Launch two tasks in parallel and wait for completion", async () => {
    const builds = await buildsManager.list();
    if (builds.Builds.length === 0) {
      console.warn("No builds available for testing");
      return;
    }

    const buildId = builds.Builds[0].BuildID;
    const response = await tasksManager.createTask(buildId, {});
    const [finalStatus1, finalStatus2] = await Promise.all([
      tasksManager.waitForTask(response.TaskID, {
        userId: userId,
        timeoutSec: 20,
      }),
      tasksManager.waitForTask(response.TaskID, {
        userId: userId,
        timeoutSec: 20,
      }),
    ]);

    expect(["Completed", "Cancelled", "Stopped"]).toContain(finalStatus1);
    expect(["Completed", "Cancelled", "Stopped"]).toContain(finalStatus2);
  }, 150000);
});
