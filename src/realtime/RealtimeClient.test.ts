import { RealtimeClient } from "./RealtimeClient";
import type { RealtimeStateChange } from "../types";
import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";

jest.mock("../runtime/ws", () => {
	class FakeWebSocket {
		static CONNECTING = 0;
		static OPEN = 1;
		static CLOSING = 2;
		static CLOSED = 3;
		static instances: FakeWebSocket[] = [];

		readyState = FakeWebSocket.CONNECTING;
		sent: any[] = [];
		closedByClient = false;
		private listeners = new Map<string, Array<(ev: any) => void>>();

		constructor() {
			FakeWebSocket.instances.push(this);
		}

		addEventListener(type: string, listener: (ev: any) => void) {
			const list = this.listeners.get(type) ?? [];
			list.push(listener);
			this.listeners.set(type, list);
		}

		send(data: string) {
			this.sent.push(JSON.parse(data));
		}

		close() {
			this.closedByClient = true;
			this.readyState = FakeWebSocket.CLOSED;
		}

		fire(type: string, ev?: any) {
			for (const listener of this.listeners.get(type) ?? []) {
				listener(ev);
			}
		}

		accept(ack: Record<string, unknown> = {}) {
			this.readyState = FakeWebSocket.OPEN;
			this.fire("open");
			this.receive({ type: "connection_ack", ...ack });
		}

		receive(msg: any) {
			this.fire("message", { data: JSON.stringify(msg) });
		}

		drop() {
			this.readyState = FakeWebSocket.CLOSED;
			this.fire("close");
		}

		fail() {
			this.fire("error", new Error("refused"));
			this.drop();
		}

		subscribeFrames() {
			return this.sent.filter((frame) => frame.type === "subscribe");
		}
	}
	return { WSClass: FakeWebSocket, hasNodeTerminate: false, hasNodeRemoveAllListeners: false };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WSClass: FakeWebSocket } = require("../runtime/ws");

function signedOutError() {
	return new SdkError(
		ERROR_CODES.AUTH_FAILED,
		"Sign in again.",
		new SdkError(ERROR_CODES.AUTH_INVALID_TOKEN, "Not signed in."),
	);
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((settle) => {
		resolve = settle;
	});
	return { promise, resolve };
}

const CHANNEL_NAME = "task-status/abc123";

function sockets(): any[] {
	return FakeWebSocket.instances;
}

function latestSocket(): any {
	return sockets()[sockets().length - 1];
}

function createAuth() {
	return {
		getWebSocketProtocols: jest.fn().mockResolvedValue([]),
		getAuthorizationHeader: jest.fn().mockResolvedValue("token"),
	};
}

function createClient(options?: { maxReconnectAttempts?: number }) {
	const auth = createAuth();
	const client = new RealtimeClient(auth as any, "wss://realtime.test/event/realtime", "realtime.test", options);
	const changes: RealtimeStateChange[] = [];
	client.on("statechange", (change) => changes.push(change));
	return { client, auth, changes };
}

async function flush() {
	await jest.advanceTimersByTimeAsync(0);
}

async function connectClient(client: RealtimeClient) {
	const connecting = client.connect();
	await flush();
	latestSocket().accept();
	await connecting;
}

async function subscribeChannel(client: RealtimeClient) {
	const subscription = await client.channel(CHANNEL_NAME).subscribe();
	const frame = latestSocket().subscribeFrames().at(-1);
	latestSocket().receive({ type: "subscribe_success", id: frame.id });
	return { subscription, channelId: frame.id as string };
}

async function reconnectAfter(delayMs: number) {
	await jest.advanceTimersByTimeAsync(delayMs);
	latestSocket().accept();
	await flush();
}

beforeEach(() => {
	jest.useFakeTimers();
	jest.spyOn(Math, "random").mockReturnValue(1);
	FakeWebSocket.instances.length = 0;
});

afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
});

describe("RealtimeClient reconnect", () => {
	it("re-subscribes a channel after the socket drops and delivers the next update to the existing handler", async () => {
		const { client } = createClient();
		await connectClient(client);
		const { subscription, channelId } = await subscribeChannel(client);
		const received: unknown[] = [];
		subscription.on("message", (msg) => received.push(msg));

		sockets()[0].drop();
		await reconnectAfter(1000);

		expect(sockets()).toHaveLength(2);
		expect(sockets()[1].subscribeFrames()).toEqual([
			expect.objectContaining({ id: channelId, channel: CHANNEL_NAME }),
		]);

		sockets()[1].receive({
			type: "data",
			id: channelId,
			payload: { data: JSON.stringify({ status: "Completed" }) },
		});
		expect(received).toEqual([{ status: "Completed" }]);
	});

	it("recovers when the first reconnect attempt fails and a later one succeeds", async () => {
		const { client } = createClient();
		await connectClient(client);
		const { channelId } = await subscribeChannel(client);

		sockets()[0].drop();
		await jest.advanceTimersByTimeAsync(1000);
		sockets()[1].fail();
		await reconnectAfter(2000);

		expect(client.getState()).toBe("open");
		expect(client.isConnected()).toBe(true);
		expect(sockets()[2].subscribeFrames()).toEqual([expect.objectContaining({ id: channelId })]);
	});

	it("schedules another attempt when fetching the socket credentials fails", async () => {
		const { client, auth } = createClient();
		await connectClient(client);

		auth.getWebSocketProtocols.mockRejectedValueOnce(new Error("token refresh failed"));
		sockets()[0].drop();
		await jest.advanceTimersByTimeAsync(1000);
		expect(sockets()).toHaveLength(1);

		await reconnectAfter(2000);
		expect(sockets()).toHaveLength(2);
		expect(client.getState()).toBe("open");
	});

	it("doubles the wait between attempts up to 30 seconds", async () => {
		const { client } = createClient();
		await connectClient(client);
		sockets()[0].drop();

		const attemptTimes: number[] = [];
		const start = Date.now();
		for (let attempt = 0; attempt < 7; attempt++) {
			const count = sockets().length;
			while (sockets().length === count) {
				await jest.advanceTimersByTimeAsync(500);
			}
			attemptTimes.push(Date.now() - start);
			latestSocket().fail();
		}

		const waits = attemptTimes.map((time, index) => time - (attemptTimes[index - 1] ?? 0));
		expect(waits).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
	});

	it("does not re-subscribe a channel that has no subscribers left", async () => {
		const { client } = createClient();
		await connectClient(client);
		const { subscription } = await subscribeChannel(client);
		subscription.close();

		sockets()[0].drop();
		await reconnectAfter(1000);

		expect(sockets()[1].subscribeFrames()).toEqual([]);
	});

	it("lets a channel subscribe again after the server rejects its subscription", async () => {
		const { client } = createClient();
		await connectClient(client);
		const channel = client.channel(CHANNEL_NAME);
		const subscription = await channel.subscribe();
		const firstFrame = sockets()[0].subscribeFrames()[0];
		const errors: unknown[] = [];
		subscription.on("error", (err) => errors.push(err));

		sockets()[0].receive({ type: "error", id: firstFrame.id, message: "not allowed" });
		await channel.subscribe();
		await flush();

		expect(errors).toHaveLength(1);
		expect(sockets()[0].subscribeFrames()).toHaveLength(2);
	});

	it("keeps a subscription alive when the socket drops again while re-subscribing", async () => {
		const { client, auth } = createClient();
		await connectClient(client);
		const { subscription, channelId } = await subscribeChannel(client);
		const errors: unknown[] = [];
		subscription.on("error", (err) => errors.push(err));

		const slowHeader = deferred<string>();
		auth.getAuthorizationHeader.mockReturnValueOnce(slowHeader.promise);
		sockets()[0].drop();
		await reconnectAfter(1000);
		sockets()[1].drop();
		slowHeader.resolve("token");
		await reconnectAfter(2000);

		expect(errors).toEqual([]);
		expect(sockets()[2].subscribeFrames()).toEqual([expect.objectContaining({ id: channelId })]);
	});

	it("emits open after a reconnect only once the subscribe frames for its channels are sent, so a refetch on open misses no update", async () => {
		const { client, auth } = createClient();
		await connectClient(client);
		await subscribeChannel(client);
		const subscribeFramesAtOpen: number[] = [];
		client.on("statechange", ({ state }) => {
			if (state === "open") {
				subscribeFramesAtOpen.push(latestSocket().subscribeFrames().length);
			}
		});

		const slowHeader = deferred<string>();
		auth.getAuthorizationHeader.mockReturnValueOnce(slowHeader.promise);
		sockets()[0].drop();
		await reconnectAfter(1000);
		expect(subscribeFramesAtOpen).toEqual([]);

		slowHeader.resolve("token");
		await flush();
		expect(subscribeFramesAtOpen).toEqual([1]);
	});

	it("goes back to reconnecting without emitting open when the authorization for the re-subscribe fails", async () => {
		const { client, auth, changes } = createClient();
		await connectClient(client);
		await subscribeChannel(client);
		const changesBefore = changes.length;

		auth.getAuthorizationHeader.mockRejectedValueOnce(new Error("token refresh failed"));
		sockets()[0].drop();
		await reconnectAfter(1000);

		expect(changes.slice(changesBefore).map(({ state }) => state)).toEqual([
			"reconnecting",
			"reconnecting",
		]);
		expect(sockets()[1].closedByClient).toBe(true);
	});

	it("sends one subscribe when a new subscribe() overlaps the re-subscribe after a reconnect", async () => {
		const { client, auth } = createClient();
		await connectClient(client);
		await subscribeChannel(client);

		const slowHeader = deferred<string>();
		auth.getAuthorizationHeader.mockReturnValueOnce(slowHeader.promise);
		sockets()[0].drop();
		await reconnectAfter(1000);
		await client.channel(CHANNEL_NAME).subscribe();
		slowHeader.resolve("token");
		await flush();

		expect(sockets()[1].subscribeFrames()).toHaveLength(1);
	});

	it("reports a rejected subscription to its subscribers and lets the channel subscribe again", async () => {
		const { client } = createClient();
		await connectClient(client);
		const channel = client.channel(CHANNEL_NAME);
		const subscription = await channel.subscribe();
		const firstFrame = sockets()[0].subscribeFrames()[0];
		const errors: unknown[] = [];
		subscription.on("error", (err) => errors.push(err));

		sockets()[0].receive({
			type: "subscribe_error",
			id: firstFrame.id,
			errors: [
				{
					errorType: "SubscriptionProcessingError",
					message: "There was an error processing the operation",
				},
			],
		});
		await channel.subscribe();
		await flush();

		expect(errors).toEqual([expect.objectContaining({ code: ERROR_CODES.WS_SUBSCRIPTION_FAILED })]);
		expect(sockets()[0].subscribeFrames()).toHaveLength(2);
	});

	it("fetches the authorization once per reconnect for all channels", async () => {
		const { client, auth } = createClient();
		await connectClient(client);
		await client.channel("task-status/one").subscribe();
		await client.channel("build-status/two").subscribe();
		const callsBefore = auth.getAuthorizationHeader.mock.calls.length;

		sockets()[0].drop();
		await reconnectAfter(1000);

		expect(sockets()[1].subscribeFrames()).toHaveLength(2);
		expect(auth.getAuthorizationHeader.mock.calls.length - callsBefore).toBe(1);
	});

	it("tells existing subscribers when a subscribe() made during the reconnect fails to send", async () => {
		const { client, auth } = createClient();
		await connectClient(client);
		const { subscription } = await subscribeChannel(client);
		const errors: unknown[] = [];
		subscription.on("error", (err) => errors.push(err));

		sockets()[0].drop();
		const headerError = new Error("token refresh failed");
		auth.getAuthorizationHeader.mockRejectedValueOnce(headerError);
		const resubscribing = client.channel(CHANNEL_NAME).subscribe();
		const rejection = expect(resubscribing).rejects.toBe(headerError);
		await flush();
		latestSocket().accept();
		await rejection;
		await flush();

		expect(client.getState()).toBe("open");
		expect(errors).toHaveLength(1);
	});
});

describe("RealtimeClient keep-alive", () => {
	it("reconnects when the server stops sending keep-alive messages", async () => {
		const { client } = createClient();
		const connecting = client.connect();
		await flush();
		sockets()[0].accept({ connectionTimeoutMs: 10000 });
		await connecting;

		await jest.advanceTimersByTimeAsync(9000);
		sockets()[0].receive({ type: "ka" });
		await jest.advanceTimersByTimeAsync(9000);
		expect(client.getState()).toBe("open");

		await jest.advanceTimersByTimeAsync(2000);
		expect(client.getState()).toBe("reconnecting");
		expect(sockets()[0].closedByClient).toBe(true);

		await reconnectAfter(1000);
		expect(client.getState()).toBe("open");
	});

	it("falls back to the default timeout when the server sends an unusable one", async () => {
		const { client } = createClient();
		const connecting = client.connect();
		await flush();
		sockets()[0].accept({ connectionTimeoutMs: 0 });
		await connecting;

		await jest.advanceTimersByTimeAsync(60000);

		expect(client.getState()).toBe("open");
		expect(sockets()).toHaveLength(1);
	});
});

describe("RealtimeClient connection state", () => {
	it("reports each transition through a drop, a failed attempt and a successful one", async () => {
		const { client, changes } = createClient();
		await connectClient(client);

		sockets()[0].drop();
		await jest.advanceTimersByTimeAsync(1000);
		sockets()[1].fail();
		await reconnectAfter(2000);

		expect(changes.map(({ previous, state, attempt }) => ({ previous, state, attempt }))).toEqual([
			{ previous: "idle", state: "connecting", attempt: 0 },
			{ previous: "connecting", state: "open", attempt: 0 },
			{ previous: "open", state: "reconnecting", attempt: 1 },
			{ previous: "reconnecting", state: "reconnecting", attempt: 2 },
			{ previous: "reconnecting", state: "open", attempt: 2 },
		]);
		expect(changes[3].error).toBeDefined();
	});

	it("stops retrying after the last allowed attempt and tells subscribers", async () => {
		const { client, changes } = createClient({ maxReconnectAttempts: 2 });
		await connectClient(client);
		const { subscription } = await subscribeChannel(client);
		const errors: unknown[] = [];
		subscription.on("error", (err) => errors.push(err));

		sockets()[0].drop();
		await jest.advanceTimersByTimeAsync(1000);
		sockets()[1].fail();
		await jest.advanceTimersByTimeAsync(2000);
		sockets()[2].fail();
		await jest.advanceTimersByTimeAsync(60000);

		expect(sockets()).toHaveLength(3);
		expect(client.getState()).toBe("closed");
		expect(changes.at(-1)).toEqual(expect.objectContaining({ state: "closed", attempt: 2 }));
		expect(changes.at(-1)?.error).toBeDefined();
		expect(errors).toHaveLength(1);
	});

	it("stops retrying when the user is signed out", async () => {
		const { client, auth } = createClient();
		await connectClient(client);

		auth.getWebSocketProtocols.mockRejectedValue(signedOutError());
		sockets()[0].drop();
		await jest.advanceTimersByTimeAsync(120000);

		expect(client.getState()).toBe("closed");
		expect(auth.getWebSocketProtocols).toHaveBeenCalledTimes(2);
	});

	it("stops retrying when the server rejects the credentials", async () => {
		const { client } = createClient();
		await connectClient(client);

		sockets()[0].drop();
		await jest.advanceTimersByTimeAsync(1000);
		sockets()[1].fire("open");
		sockets()[1].receive({
			type: "connection_error",
			errors: [{ errorType: "AuthorizerFailureException", message: "Unauthorized", errorCode: 500 }],
		});
		await jest.advanceTimersByTimeAsync(120000);

		expect(client.getState()).toBe("closed");
		expect(sockets()).toHaveLength(2);
	});

	it("keeps retrying when the authorizer fails for another reason", async () => {
		const { client } = createClient();
		await connectClient(client);

		sockets()[0].drop();
		await jest.advanceTimersByTimeAsync(1000);
		sockets()[1].fire("open");
		sockets()[1].receive({
			type: "connection_error",
			errors: [
				{
					errorType: "AuthorizerFailureException",
					message: "InternalServerError",
					errorCode: 500,
				},
			],
		});
		await jest.advanceTimersByTimeAsync(2000);

		expect(client.getState()).toBe("reconnecting");
		expect(sockets()).toHaveLength(3);
	});

	it("stops reconnecting when a statechange listener calls close()", async () => {
		const { client } = createClient();
		client.on("statechange", ({ state }) => {
			if (state === "reconnecting") {
				client.close();
			}
		});
		await connectClient(client);

		sockets()[0].drop();
		await jest.advanceTimersByTimeAsync(60000);

		expect(sockets()).toHaveLength(1);
		expect(client.getState()).toBe("closed");
	});

	it("tells every subscriber it stopped reconnecting even when a statechange listener calls close()", async () => {
		const { client } = createClient({ maxReconnectAttempts: 0 });
		client.on("statechange", ({ state }) => {
			if (state === "closed") {
				client.close();
			}
		});
		await connectClient(client);
		const first = await client.channel("task-status/one").subscribe();
		const second = await client.channel("build-status/two").subscribe();
		const firstErrors: unknown[] = [];
		const secondErrors: unknown[] = [];
		first.on("error", (err) => firstErrors.push(err));
		second.on("error", (err) => secondErrors.push(err));

		sockets()[0].drop();
		await flush();

		expect(firstErrors).toHaveLength(1);
		expect(secondErrors).toHaveLength(1);
	});

	it("tells every subscriber it stopped reconnecting even when one error handler calls close()", async () => {
		const { client } = createClient({ maxReconnectAttempts: 0 });
		await connectClient(client);
		const first = await client.channel("task-status/one").subscribe();
		const second = await client.channel("build-status/two").subscribe();
		const secondErrors: unknown[] = [];
		first.on("error", () => client.close());
		second.on("error", (err) => secondErrors.push(err));

		sockets()[0].drop();
		await flush();

		expect(secondErrors).toHaveLength(1);
	});

	it("stops the client when the server rejects the credentials of a subscription on the open socket", async () => {
		const { client, changes } = createClient();
		await connectClient(client);
		const { subscription: rejected, channelId } = await subscribeChannel(client);
		const other = await client.channel("build-status/two").subscribe();
		const rejectedErrors: unknown[] = [];
		const otherErrors: unknown[] = [];
		rejected.on("error", (err) => rejectedErrors.push(err));
		other.on("error", (err) => otherErrors.push(err));

		sockets()[0].receive({
			type: "subscribe_error",
			id: channelId,
			errors: [{ errorType: "AuthorizerFailureException", message: "Unauthorized" }],
		});
		await jest.advanceTimersByTimeAsync(60000);

		expect(client.getState()).toBe("closed");
		expect(changes.at(-1)).toEqual(
			expect.objectContaining({
				state: "closed",
				error: expect.objectContaining({ code: ERROR_CODES.WS_UNAUTHORIZED }),
			}),
		);
		expect(rejectedErrors).toHaveLength(1);
		expect(otherErrors).toHaveLength(1);
		expect(sockets()).toHaveLength(1);
	});

	it("keeps a failed subscription on the open socket scoped to its channel when the authorizer fails for another reason", async () => {
		const { client } = createClient();
		await connectClient(client);
		const { subscription: rejected, channelId } = await subscribeChannel(client);
		const other = await client.channel("build-status/two").subscribe();
		const rejectedErrors: unknown[] = [];
		const otherErrors: unknown[] = [];
		rejected.on("error", (err) => rejectedErrors.push(err));
		other.on("error", (err) => otherErrors.push(err));

		sockets()[0].receive({
			type: "subscribe_error",
			id: channelId,
			errors: [{ errorType: "AuthorizerFailureException", message: "InternalServerError" }],
		});
		await flush();

		expect(client.getState()).toBe("open");
		expect(rejectedErrors).toEqual([expect.objectContaining({ code: ERROR_CODES.WS_SUBSCRIPTION_FAILED })]);
		expect(otherErrors).toEqual([]);
	});

	it("keeps retrying when refreshing the session fails for another reason", async () => {
		const { client, auth } = createClient();
		await connectClient(client);

		auth.getWebSocketProtocols.mockRejectedValue(
			new SdkError(ERROR_CODES.AUTH_FAILED, "Sign in again.", new TypeError("Failed to fetch")),
		);
		sockets()[0].drop();
		await jest.advanceTimersByTimeAsync(10000);

		expect(client.getState()).toBe("reconnecting");
		expect(auth.getWebSocketProtocols.mock.calls.length).toBeGreaterThan(2);
	});

	it("retries immediately when the browser reports it is back online", async () => {
		const browserEvents = new EventTarget();
		Object.assign(globalThis, {
			addEventListener: browserEvents.addEventListener.bind(browserEvents),
			removeEventListener: browserEvents.removeEventListener.bind(browserEvents),
		});
		try {
			const { client } = createClient();
			await connectClient(client);

			sockets()[0].drop();
			await jest.advanceTimersByTimeAsync(1000);
			sockets()[1].fail();
			await flush();
			browserEvents.dispatchEvent(new Event("online"));
			await flush();

			expect(sockets()).toHaveLength(3);
		} finally {
			delete (globalThis as any).addEventListener;
			delete (globalThis as any).removeEventListener;
		}
	});

	it("makes no further attempts after close() during the wait", async () => {
		const { client } = createClient();
		await connectClient(client);

		sockets()[0].drop();
		client.close();
		await jest.advanceTimersByTimeAsync(60000);

		expect(sockets()).toHaveLength(1);
		expect(client.getState()).toBe("closed");
	});

	it("rejects a failed first connect and leaves retrying to the caller", async () => {
		const { client } = createClient();
		const connecting = client.connect();
		await flush();
		sockets()[0].fail();

		await expect(connecting).rejects.toMatchObject({ code: ERROR_CODES.REALTIME_FATAL });
		await jest.advanceTimersByTimeAsync(60000);
		expect(sockets()).toHaveLength(1);
		expect(client.getState()).toBe("idle");

		await connectClient(client);
		expect(client.getState()).toBe("open");
	});
});

describe("RealtimeClient socket handling", () => {
	it("closes a socket whose handshake times out", async () => {
		const { client } = createClient();
		const connecting = client.connect();
		const rejection = expect(connecting).rejects.toMatchObject({ code: ERROR_CODES.REALTIME_TIMEOUT });
		await jest.advanceTimersByTimeAsync(30000);

		await rejection;
		expect(sockets()[0].closedByClient).toBe(true);
	});

	it("ignores a close event from a socket that is no longer current", async () => {
		const { client } = createClient();
		await connectClient(client);
		const staleSocket = sockets()[0];

		staleSocket.drop();
		await reconnectAfter(1000);
		staleSocket.fire("close");
		await jest.advanceTimersByTimeAsync(60000);

		expect(client.isConnected()).toBe(true);
		expect(sockets()).toHaveLength(2);
	});

	it("keeps retrying when a connect replaced a socket that was still closing", async () => {
		const { client } = createClient();
		await connectClient(client);
		const closingSocket = sockets()[0];
		closingSocket.readyState = FakeWebSocket.CLOSING;

		const connecting = client.connect();
		const rejection = expect(connecting).rejects.toMatchObject({ code: ERROR_CODES.REALTIME_FATAL });
		await flush();
		closingSocket.drop();
		sockets()[1].fail();
		await rejection;

		expect(client.getState()).toBe("reconnecting");
		await reconnectAfter(2000);
		expect(client.getState()).toBe("open");
	});

	it("does not count replacing a closing socket as a reconnect attempt when the new connect succeeds", async () => {
		const { client, changes } = createClient({ maxReconnectAttempts: 0 });
		await connectClient(client);
		const { subscription } = await subscribeChannel(client);
		const errors: unknown[] = [];
		subscription.on("error", (err) => errors.push(err));
		sockets()[0].readyState = FakeWebSocket.CLOSING;
		const changesBefore = changes.length;

		const connecting = client.connect();
		await flush();
		sockets()[1].accept();
		await connecting;

		expect(errors).toEqual([]);
		expect(changes.slice(changesBefore).map(({ state }) => state)).toEqual(["connecting", "open"]);
	});

	it("rejects a caller that joined a connect which close() then cancelled", async () => {
		const { client } = createClient();
		const owner = client.connect();
		const joiner = client.connect();
		const notConnected = { code: ERROR_CODES.REALTIME_NOT_CONNECTED };
		const rejections = Promise.all([
			expect(owner).rejects.toMatchObject(notConnected),
			expect(joiner).rejects.toMatchObject(notConnected),
		]);
		await flush();

		client.close();
		sockets()[0].accept();
		await rejections;
		expect(client.isConnected()).toBe(false);
	});

	it("joins the same handshake when a connecting listener calls connect()", async () => {
		const { client } = createClient();
		let listenerConnect: Promise<void> | undefined;
		client.on("statechange", ({ state }) => {
			if (state === "connecting" && !listenerConnect) {
				listenerConnect = client.connect();
			}
		});

		const owner = client.connect();
		await flush();
		expect(sockets()).toHaveLength(1);

		sockets()[0].accept();
		await expect(Promise.all([owner, listenerConnect])).resolves.toEqual([undefined, undefined]);
		expect(client.isConnected()).toBe(true);
	});
});
