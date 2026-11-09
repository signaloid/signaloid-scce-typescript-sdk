import { AxiosInstance } from "axios";
import { BuildsManager } from "./BuildsManager";
import { RealtimeClient } from "../realtime/RealtimeClient";
import { AuthManager } from "../auth/AuthManager";
import { UsersManager } from "../users/UsersManager";

const BUILD_ID = "bld_1";

// GET /builds/{id} answers with each status in turn, then repeats the last one.
function stubClient(owner: string, statuses: string[]) {
	let call = 0;
	const get = jest.fn(async () => {
		const Status = statuses[Math.min(call++, statuses.length - 1)];
		return { data: { BuildID: BUILD_ID, Owner: owner, Status } };
	});
	return { client: { get } as unknown as AxiosInstance, get };
}

function stubRealtime(subscribe: () => Promise<unknown>) {
	const channel = jest.fn(() => ({ subscribe }));
	return { realtime: { channel } as unknown as RealtimeClient, channel };
}

const auth = { getUserId: async () => "usr_me" } as unknown as AuthManager;
const users = { me: async () => ({ UserID: "usr_me" }) } as unknown as UsersManager;

describe("BuildsManager.waitForBuild", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("returns a build that has already finished without subscribing", async () => {
		const { client } = stubClient("usr_me", ["Completed"]);
		const { realtime, channel } = stubRealtime(async () => ({}));

		await expect(new BuildsManager(client, realtime, auth, users).waitForBuild(BUILD_ID)).resolves.toBe(
			"Completed",
		);
		expect(channel).not.toHaveBeenCalled();
	});

	it("polls, without subscribing, for a build the caller does not own", async () => {
		const { client } = stubClient("usr_other", ["In Progress", "In Progress", "Completed"]);
		const { realtime, channel } = stubRealtime(async () => ({}));

		const wait = new BuildsManager(client, realtime, auth, users).waitForBuild(BUILD_ID);
		await jest.advanceTimersByTimeAsync(10_000);

		await expect(wait).resolves.toBe("Completed");
		expect(channel).not.toHaveBeenCalled();
	});

	it("finishes on a live event for a build the caller owns", async () => {
		const { client } = stubClient("usr_me", ["In Progress"]);
		const handlers: Record<string, (msg: unknown) => void> = {};
		const subscription = {
			on: (event: string, cb: (msg: unknown) => void) => (handlers[event] = cb),
			close: jest.fn(),
		};
		const { realtime, channel } = stubRealtime(async () => subscription);

		const wait = new BuildsManager(client, realtime, auth, users).waitForBuild(BUILD_ID);
		await jest.advanceTimersByTimeAsync(0);
		handlers.message({
			EventType: "build-status",
			Timestamp: "t",
			Data: { BuildID: BUILD_ID, Status: "Completed" },
		});

		await expect(wait).resolves.toBe("Completed");
		expect(channel).toHaveBeenCalledWith("build-status/me");
		expect(subscription.close).toHaveBeenCalled();
	});

	it("falls back to polling when the owner's subscription fails", async () => {
		const { client } = stubClient("usr_me", ["In Progress", "In Progress", "Stopped"]);
		const { realtime, channel } = stubRealtime(async () => {
			throw new Error("realtime unavailable");
		});

		const wait = new BuildsManager(client, realtime, auth, users).waitForBuild(BUILD_ID);
		await jest.advanceTimersByTimeAsync(10_000);

		await expect(wait).resolves.toBe("Stopped");
		expect(channel).toHaveBeenCalledWith("build-status/me");
	});

	it("rejects at once when the build lookup fails", async () => {
		const get = jest.fn(async () => {
			throw new Error("401 Unauthorized");
		});
		const { realtime } = stubRealtime(async () => ({}));

		await expect(
			new BuildsManager({ get } as unknown as AxiosInstance, realtime, auth, users).waitForBuild(
				BUILD_ID,
			),
		).rejects.toThrow("401 Unauthorized");
	});
});
