import {
  WSClass,
  hasNodeTerminate,
  hasNodeRemoveAllListeners,
} from "#ws-runtime";
import { AuthManager } from "../auth/AuthManager";
import { Channel } from "./Channel";
import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";

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
  private connPromise: Promise<WSLike> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closeRequested = false;

  private auth: AuthManager;
  private endpoint: string;
  private host: string;

  private channelsByName = new Map<string, Channel>();
  private channelsById = new Map<string, Channel>();

  // Snapshot websocket state constants once (from the implementation)
  private readonly WS_OPEN: number;
  private readonly WS_CONNECTING: number;

  constructor(auth: AuthManager, endpoint: string, host: string) {
    this.auth = auth;
    this.endpoint = endpoint;
    this.host = host;

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
   * If a connection is already open or connecting, does nothing.
   * @returns {Promise<void>} Resolves when the connection is established.
   * @throws {SdkError} If the WebSocket fails to connect.
   */
  public async connect(): Promise<void> {
    this.closeRequested = false;

    const curState = this.ws?.readyState;
    if (curState === this.WS_OPEN) {
      return;
    }
    if (curState === this.WS_CONNECTING) {
      console.warn("Warning: Existing websocket found not-ready (connecting)");
      return;
    }

    // In remaining states (null, CLOSED, CLOSING) we have to reconnect
    if (!this.connPromise) {
      // Let others know we're connecting
      this.connPromise = this._connect();
      this.ws = await this.connPromise;
      this.connPromise = null;
    } else {
      // Late connection requests wait on the same ws connection
      await this.connPromise;
    }
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
      throw new SdkError(
        ERROR_CODES.REALTIME_NOT_CONNECTED,
        "WebSocket is not connected yet",
      );
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

    // Clear any pending reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear channel maps
    this.channelsByName.clear();
    this.channelsById.clear();

    // Close WebSocket connection immediately
    if (this.ws) {
      // Remove all listeners to prevent any callbacks (Node only; no-op in browser)
      removeAllListenersSafe(this.ws);

      // Close the WebSocket
      const state = this.ws.readyState;
      if (state === this.WS_OPEN || state === this.WS_CONNECTING) {
        if (options?.force) {
          terminateSafe(this.ws);
        } else {
          this.ws.close(1000, "client-close");
        }
      }

      this.ws = null;
    }
  }

  // Internal method to establish a new WebSocket connection.
  // Handles connection, protocol negotiation, and message events.
  // rejects the promise if we get connection_error or error back
  private async _connect(): Promise<WSLike> {
    const timeoutSec = 30;
    const reconnectDelayMs = 1000;
    const protocols = await this.auth.getWebSocketProtocols();

    const ws: WSLike = new (WSClass as any)(this.endpoint, protocols as any);

    // Cross-env event binding
    bind(ws, "open", () => {
      ws.send(JSON.stringify({ type: "connection_init" }));
    });

    bind(ws, "close", () => {
      this.ws = null;

      // Only schedule reconnection if we didn't intentionally close
      if (!this.closeRequested) {
        // IMPORTANT: preserve `this`
        this.reconnectTimer = setTimeout(
          () => this.connect(),
          reconnectDelayMs,
        );
      }
    });

    return new Promise((resolve, reject) => {
      const ackTimeout = setTimeout(() => {
        reject(
          new SdkError(
            ERROR_CODES.REALTIME_TIMEOUT,
            "WebSocket connection timeout",
          ),
        );
      }, timeoutSec * 1000);

      bind(ws, "error", (err: any) => {
        clearTimeout(ackTimeout);
        const message = err?.message || String(err);
        reject(
          new SdkError(
            ERROR_CODES.REALTIME_FATAL,
            "WebSocket crashed: " + message,
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

        try {
          if (msg.type === "connection_ack") {
            clearTimeout(ackTimeout);
            resolve(ws);
            return;
          } else if (msg.type === "connection_error" || msg.type === "error") {
            const channel = this.channelsById.get(msg.id);
            const errMsg = msg.message || "WebSocket connection error";
            const err = new SdkError(
              ERROR_CODES.REALTIME_CONNECTION_FAILED,
              errMsg,
            );
            channel?.emit("error", err);
            clearTimeout(ackTimeout);
            reject(err);
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

function removeAllListenersSafe(ws: WSLike) {
  if (
    hasNodeRemoveAllListeners &&
    typeof ws.removeAllListeners === "function"
  ) {
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
