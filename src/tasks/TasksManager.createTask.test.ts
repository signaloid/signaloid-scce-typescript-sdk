import { AxiosInstance } from "axios";
import { TasksManager } from "./TasksManager";
import type { TaskDataSource } from "../types/tasks";

const CLOUD_STORAGE: TaskDataSource = { ResourceID: "res_storage", ResourceType: "SignaloidCloudStorage" };

describe("TasksManager.createTask", () => {
	it("keeps MaxDurationSeconds when it adds Signaloid Cloud Storage", async () => {
		const post = jest.fn(async () => ({ data: { TaskID: "tsk_1" } }));
		const datasources = { getSignaloidCloudStorage: async () => CLOUD_STORAGE };
		const tasks = new TasksManager(
			{ post } as unknown as AxiosInstance,
			{} as never,
			{} as never,
			{} as never,
			datasources as never,
			{} as never,
		);

		await tasks.createTask("bld_1", { MaxDurationSeconds: 90 }, { useSignaloidCloudStorage: true });

		expect(post).toHaveBeenCalledWith("/builds/bld_1/tasks", {
			MaxDurationSeconds: 90,
			DataSources: [CLOUD_STORAGE],
		});
	});
});
