import { WSClass, hasNodeTerminate, hasNodeRemoveAllListeners } from "../runtime/ws";
import { AuthManager } from "../auth/AuthManager";
import { Channel } from "./Channel";
import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";
import type { RealtimeClientOptions, RealtimeState, RealtimeStateChange } from "../types";
import { unrefTimer } from "../utils/timers";

type StateChangeCallback = (change: RealtimeStateChange) => void;

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const DEFAULT_KEEP_ALIVE_TIMEOUT_MS = 300000;

const PERMANENT_AUTH_CODES = [
	ERROR_CODES.AUTH_MISSING_TOKEN,
	ERROR_CODES.AUTH_INVALID_TOKEN,
	ERROR_CODES.AUTH_NOT_LOGGED_IN,
	ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
	ERROR_CODES.WS_UNAUTHORIZED,
];

type WSLike = {
	readyState: number;
	send(data: string): void;
	close(code?: number, reason?: string): void;
	// Browser
	addEventListener?: (type: string, listener: (ev: any) => void) => void;
	removeEventListener?: (type: string, listener: (ev: any) => void) => void;
	// Node
	on?: (event: string, listener: (...args: any[]) => void) => any;
	removeAllListeners?: () => void;
	terminate?: () => void;
	// Common
	constructor?: any;
};

export class RealtimeClient {
	private ws: WSLike | null = null;
	private connPromise: Promise<void> | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private keepAliveTimer: ReturnType<typeof setTimeout> | null = null;
	private keepAliveTimeoutMs = DEFAULT_KEEP_ALIVE_TIMEOUT_MS;
	private closeRequested = false;
	private state: RealtimeState = "idle";
	private reconnectAttempt = 0;
	private stateListeners = new Set<StateChangeCallback>();
	private readonly maxReconnectAttempts: number;

	private auth: AuthManager;
	private endpoint: string;
	private host: string;

	private channelsByName = new Map<string, Channel>();
	private channelsById = new Map<string, Channel>();

	// Snapshot websocket state constants once (from the implementation)
	private readonly WS_OPEN: number;
	private readonly WS_CONNECTING: number;

	constructor(auth: AuthManager, endpoint: string, host: string, options: RealtimeClientOptions = {}) {
		this.auth = auth;
		this.endpoint = endpoint;
		this.host = host;
		this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;

		const ctor = (WSClass as any) ?? {};
		this.WS_OPEN = ctor.OPEN ?? 1;
		this.WS_CONNECTING = ctor.CONNECTING ?? 0;
	}

	/**
	 * Creates a new channel instance or returns an existing one by name.
	 * The channel will not receive updates until subscribed.
	 * @param {string} name - The name of the channel to create or retrieve.
	 * @returns {Channel} The channel instance associated with the given name.
	 */
	public channel(name: string): Channel {
		if (!this.channelsByName.has(name)) {
			const channel = new Channel(name, this);
			this.channelsByName.set(name, channel);
			this.channelsById.set(channel.getId(), channel);
		}
		return this.channelsByName.get(name)!;
	}

	/**
	 * Establishes a WebSocket connection to the realtime endpoint.
	 * Resolves once the connection is acknowledged by the server.
	 * If a connection is already open or connecting, waits for it.
	 * A failed first connection is not retried. Once a connection has been open,
	 * a drop is retried with backoff and every channel with subscribers is subscribed again.
	 * @returns {Promise<void>} Resolves when the connection is established.
	 * @throws {SdkError} If the WebSocket fails to connect.
	 */
	public async connect(): Promise<void> {
		this.closeRequested = false;

		if (this.isConnected()) {
			return;
		}

		// Late connection requests wait on the same WebSocket connection
		if (this.connPromise) {
			return this.connPromise;
		}

		// A socket that is still closing has not fired "close" yet.
		const replacedSocket = this.ws !== null;
		if (replacedSocket) {
			this.releaseSocket();
		}

		const isReconnect = this.state === "reconnecting";
		this.cancelReconnect();

		// Assigned before "connecting" is emitted, so a listener that calls connect() joins this handshake.
		this.connPromise = this.openConnection(isReconnect || replacedSocket);
		if (!isReconnect) {
			this.setState("connecting");
		}
		return this.connPromise;
	}

	private async openConnection(retryOnFailure: boolean): Promise<void> {
		let opened: OpenedSocket;
		try {
			opened = await this._connect();
		} catch (error) {
			this.connPromise = null;
			if (!this.closeRequested) {
				if (retryOnFailure) {
					this.scheduleReconnect(error);
				} else {
					this.setState("idle", error);
				}
			}
			throw error;
		}
		this.connPromise = null;

		if (this.closeRequested) {
			this.discardSocket(opened.ws);
			throw new SdkError(ERROR_CODES.REALTIME_NOT_CONNECTED, "WebSocket was closed while connecting");
		}

		this.ws = opened.ws;
		this.keepAliveTimeoutMs = opened.keepAliveTimeoutMs;
		this.resetKeepAlive();
		const channels = [...this.channelsById.values()].filter((channel) => channel.needsResubscribe());
		if (channels.length > 0) {
			await this.resubscribeChannels(opened.ws, channels);
		}
		this.setState("open");
		this.reconnectAttempt = 0;
	}

	/**
	 * Returns the current connection state.
	 */
	public getState(): RealtimeState {
		return this.state;
	}

	/**
	 * Registers a callback for connection state changes.
	 */
	public on(event: "statechange", callback: StateChangeCallback): void {
		this.stateListeners.add(callback);
	}

	/**
	 * Removes a previously registered state change callback.
	 */
	public off(event: "statechange", callback: StateChangeCallback): void {
		this.stateListeners.delete(callback);
	}

	/**
	 * Checks if the WebSocket connection is currently open.
	 * @returns {boolean} True if the WebSocket is open, false otherwise.
	 */
	public isConnected(): boolean {
		return this.ws?.readyState === this.WS_OPEN;
	}

	/**
	 * Sends data over the active WebSocket connection.
	 * @param {any} data - The data to send (will be JSON-stringified).
	 * @throws {SdkError} If the WebSocket is not connected.
	 */
	public send(data: any) {
		if (!this.isConnected()) {
			throw new SdkError(ERROR_CODES.REALTIME_NOT_CONNECTED, "WebSocket is not connected yet");
		}

		const dataString = JSON.stringify(data);
		try {
			this.ws!.send(dataString);
		} catch (_err) {
			console.log("Failed sending: ", data, "Retrying...");
			this.ws!.send(dataString);
		}
	}

	/**
	 * Closes the WebSocket connection and clears all channels.
	 * Optionally forces closure.
	 * @param {Object} [options] - Optional parameters.
	 * @param {boolean} [options.force] - If true, forcibly closes the connection.
	 */
	public close(options?: { force: boolean }): void {
		this.closeRequested = true;
		this.cancelReconnect();
		this.stopKeepAlive();
		this.reconnectAttempt = 0;
		this.setState("closed");

		// Clear channel maps
		this.channelsByName.clear();
		this.channelsById.clear();

		if (this.ws) {
			this.discardSocket(this.ws, options);
			this.ws = null;
		}
	}

	private setState(state: RealtimeState, error?: unknown) {
		const previous = this.state;
		if (previous === state && state !== "reconnecting") {
			return;
		}
		this.state = state;
		if (state !== "reconnecting") {
			(globalThis as any).removeEventListener?.("online", this.handleOnline);
		}

		const change: RealtimeStateChange = { state, previous, attempt: this.reconnectAttempt };
		if (error !== undefined) {
			change.error = error;
		}
		for (const callback of this.stateListeners) {
			try {
				callback(change);
			} catch (err) {
				console.log("Error: Callback failed: ", err);
			}
		}
	}

	private scheduleReconnect(error?: unknown) {
		if (isPermanentAuthFailure(error) || this.reconnectAttempt >= this.maxReconnectAttempts) {
			this.giveUp(error);
			return;
		}
		this.reconnectAttempt += 1;
		// Armed before listeners run, so a close() from a listener can cancel it.
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect().catch(() => {});
		}, reconnectDelay(this.reconnectAttempt));
		(globalThis as any).addEventListener?.("online", this.handleOnline);
		this.setState("reconnecting", error);
	}

	private giveUp(error?: unknown) {
		// Taken before any listener runs, since close() clears the map.
		const channels = [...this.channelsById.values()];
		this.setState("closed", error);
		this.reconnectAttempt = 0;
		const channelError =
			error instanceof SdkError
				? error
				: new SdkError(
						ERROR_CODES.REALTIME_CONNECTION_FAILED,
						"WebSocket stopped reconnecting",
						error,
					);
		for (const channel of channels) {
			channel.emit("error", channelError);
		}
	}

	private dropConnection(error?: unknown) {
		if (!this.ws) {
			return;
		}
		this.releaseSocket();
		if (!this.closeRequested) {
			this.scheduleReconnect(error);
		}
	}

	private releaseSocket() {
		if (!this.ws) {
			return;
		}
		this.discardSocket(this.ws);
		this.ws = null;
		this.stopKeepAlive();
		for (const channel of this.channelsById.values()) {
			channel.markDisconnected();
		}
	}

	private discardSocket(ws: WSLike, options?: { force: boolean }) {
		removeAllListenersSafe(ws);
		// Node's ws emits "error" when a socket closes mid-handshake, and an unhandled "error" throws.
		bind(ws, "error", () => {});
		if (ws.readyState === this.WS_OPEN || ws.readyState === this.WS_CONNECTING) {
			if (options?.force) {
				terminateSafe(ws);
			} else {
				ws.close(1000, "client-close");
			}
		}
	}

	private async resubscribeChannels(ws: WSLike, channels: Channel[]) {
		let authorization: string;
		try {
			authorization = await this.auth.getAuthorizationHeader();
		} catch (error) {
			if (this.ws === ws) {
				this.dropConnection(error);
			}
			throw error;
		}
		if (this.ws !== ws) {
			throw new SdkError(
				ERROR_CODES.REALTIME_NOT_CONNECTED,
				"WebSocket was closed while subscribing again",
			);
		}
		for (const channel of channels) {
			channel.resubscribe(authorization);
		}
	}

	private resetKeepAlive() {
		this.stopKeepAlive();
		this.keepAliveTimer = unrefTimer(
			setTimeout(() => {
				this.keepAliveTimer = null;
				this.dropConnection(
					new SdkError(
						ERROR_CODES.REALTIME_TIMEOUT,
						"WebSocket stopped receiving keep-alive messages",
					),
				);
			}, this.keepAliveTimeoutMs),
		);
	}

	private stopKeepAlive() {
		if (this.keepAliveTimer) {
			clearTimeout(this.keepAliveTimer);
			this.keepAliveTimer = null;
		}
	}

	private cancelReconnect() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	private readonly handleOnline = () => {
		if (this.state === "reconnecting" && !this.connPromise) {
			this.connect().catch(() => {});
		}
	};

	// Internal method to establish a new WebSocket connection.
	// Handles connection, protocol negotiation, and message events.
	// rejects the promise if we get connection_error or error back
	private async _connect(): Promise<OpenedSocket> {
		const timeoutSec = 30;
		const protocols = await this.auth.getWebSocketProtocols(this.host);

		const ws: WSLike = new (WSClass as any)(this.endpoint, protocols as any);

		// Cross-env event binding
		bind(ws, "open", () => {
			ws.send(JSON.stringify({ type: "connection_init" }));
		});

		return new Promise((resolve, reject) => {
			let settled = false;
			const fail = (err: SdkError) => {
				if (settled) return;
				settled = true;
				clearTimeout(ackTimeout);
				this.discardSocket(ws);
				reject(err);
			};

			const ackTimeout = setTimeout(() => {
				fail(new SdkError(ERROR_CODES.REALTIME_TIMEOUT, "WebSocket connection timeout"));
			}, timeoutSec * 1000);

			bind(ws, "error", (err: any) => {
				const message = err?.message || String(err);
				fail(new SdkError(ERROR_CODES.REALTIME_FATAL, "WebSocket crashed: " + message));
			});

			bind(ws, "close", () => {
				if (this.ws === ws) {
					this.dropConnection();
					return;
				}
				fail(
					new SdkError(
						ERROR_CODES.REALTIME_CONNECTION_FAILED,
						"WebSocket closed before connecting",
					),
				);
			});

			bind(ws, "message", (ev: any) => {
				const text = extractMessageText(ev);
				if (!text) return;

				let msg: any;
				try {
					msg = JSON.parse(text);
				} catch {
					return;
				}

				if (this.ws === ws) {
					this.resetKeepAlive();
				}

				try {
					if (msg.type === "connection_ack") {
						if (settled) return;
						settled = true;
						clearTimeout(ackTimeout);
						const connectionTimeoutMs =
							msg.connectionTimeoutMs ?? msg.payload?.connectionTimeoutMs;
						resolve({
							ws,
							keepAliveTimeoutMs:
								Number.isFinite(connectionTimeoutMs) &&
								connectionTimeoutMs > 0
									? connectionTimeoutMs
									: DEFAULT_KEEP_ALIVE_TIMEOUT_MS,
						});
						return;
					} else if (
						msg.type === "connection_error" ||
						msg.type === "error" ||
						msg.type === "subscribe_error"
					) {
						const err = errorFromFrame(msg);
						if (settled && this.ws === ws && isPermanentAuthFailure(err)) {
							this.dropConnection(err);
							return;
						}
						const channel = this.channelsById.get(msg.id);
						channel?.emit("error", err);
						fail(err);
						return;
					} else if (msg.type === "data") {
						const event = msg.payload?.data ?? msg.event;
						const channel = this.channelsById.get(msg.id);
						try {
							const payload =
								typeof event === "string" ? JSON.parse(event) : event;
							channel?.emit("message", payload);
						} catch {
							// ignore malformed payload
						}
						return;
					} else if (
						msg.type === "subscribe_success" ||
						msg.type === "unsubscribe_success"
					) {
						const channel = this.channelsById.get(msg.id);
						channel?.emit(msg.type, null);
						return;
					}
				} catch {
					// ignore malformed frames / handler errors
				}
			});
		});
	}
}

function bind(ws: WSLike, type: string, fn: (...args: any[]) => void) {
	if (typeof (ws as any).addEventListener === "function") {
		(ws as any).addEventListener(type, fn);
	} else if (typeof (ws as any).on === "function") {
		(ws as any).on(type, fn);
	}
}

function extractMessageText(ev: any): string | null {
	const raw = ev?.data ?? ev;
	if (typeof raw === "string") return raw;
	if (raw && typeof raw.toString === "function") return raw.toString();
	return null;
}

type OpenedSocket = { ws: WSLike; keepAliveTimeoutMs: number };

function errorFromFrame(msg: any): SdkError {
	const errors: Array<{ errorType?: string; message?: string }> = Array.isArray(msg.errors) ? msg.errors : [];
	const message = msg.message || errors[0]?.message || "WebSocket connection error";
	let code = ERROR_CODES.REALTIME_CONNECTION_FAILED;
	if (errors.some(isCredentialRejection)) {
		code = ERROR_CODES.WS_UNAUTHORIZED;
	} else if (msg.type === "subscribe_error") {
		code = ERROR_CODES.WS_SUBSCRIPTION_FAILED;
	}
	return new SdkError(code, message, msg);
}

// The Signaloid authorizer fails with "Unauthorized" for bad credentials and "InternalServerError" otherwise.
function isCredentialRejection(error: { errorType?: string; message?: string }): boolean {
	return (
		error?.errorType === "UnauthorizedException" ||
		(error?.errorType === "AuthorizerFailureException" && error.message === "Unauthorized")
	);
}

function isPermanentAuthFailure(error: unknown): boolean {
	if (!(error instanceof SdkError)) {
		return false;
	}
	if (PERMANENT_AUTH_CODES.includes(error.code)) {
		return true;
	}
	return error.code === ERROR_CODES.AUTH_FAILED && isPermanentAuthFailure(error.details);
}

function reconnectDelay(attempt: number): number {
	const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1), RECONNECT_MAX_DELAY_MS);
	return delay / 2 + (Math.random() * delay) / 2;
}

function removeAllListenersSafe(ws: WSLike) {
	if (hasNodeRemoveAllListeners && typeof ws.removeAllListeners === "function") {
		ws.removeAllListeners();
	}
}

function terminateSafe(ws: WSLike) {
	if (hasNodeTerminate && typeof ws.terminate === "function") {
		ws.terminate();
	} else {
		// Fallback to graceful close if terminate is not available
		ws.close(1000, "client-close");
	}
}
