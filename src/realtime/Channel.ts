import { v4 as uuidv4 } from "uuid";
import { RealtimeClient } from "./RealtimeClient";
import { sanitizeChannelName } from "../utils/sanitizeChannelName";
import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";

type EventType =
  | "message"
  | "error"
  | "subscribe_success"
  | "unsubscribe_success";
type Callback = (msg: any) => void;

export class SubscriptionClient {
  private channel: Channel;
  private callbacks: Map<EventType, Set<Callback>> = new Map();

  /**
   * Creates a new SubscriptionClient bound to a specific Channel.
   * @param ch The Channel instance this subscription is associated with.
   */
  constructor(ch: Channel) {
    this.channel = ch;
  }

  /**
   * Registers a callback for a specific event type.
   * @param event The type of event to listen for.
   * @param callback The function to be called when the event occurs.
   */
  public on(event: EventType, callback: Callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
  }

  /**
   * Removes a previously registered callback for an event type.
   * @param event The event type.
   * @param callback The callback to remove.
   */
  public off(event: EventType, callback: Callback) {
    const cbs = this.callbacks.get(event);
    if (cbs) {
      cbs.delete(callback);
    }
  }

  /**
   * Emits an event to all registered callbacks for that event.
   * @param eventName The event type.
   * @param data The data to be passed to the callback.
   */
  public emit(eventName: EventType, data: any) {
    const cbs = this.callbacks.get(eventName);
    if (!cbs) return;
    for (const cb of cbs) {
      try {
        cb(data);
      } catch (err) {
        console.log("Error: Callback failed: ", err);
      }
    }
  }

  /**
   * Clears all event handlers for this subscription.
   */
  public clearHandlers() {
    this.callbacks.clear();
  }

  /**
   * Closes the subscription and removes all handlers.
   */
  public close() {
    this.clearHandlers();
    this.channel.unsubscribe(this);
  }
}

export class Channel {
  private id = uuidv4();
  private name: string;
  private client: RealtimeClient;
  private subscribers: Set<SubscriptionClient>;
  private enabled: boolean = false;
  private transition: null | "enabling" | "disabling" = null;
  private unsubscribeTimeout: any = null;

  /**
   * Creates a new Channel instance.
   * Channels represent a given remote stream of events, identified by a name.
   * NOTE: The stream is only activated upon calling subscribe()
   * @param name The name of the channel.
   * @param client The RealtimeClient managing this channel.
   */
  constructor(name: string, client: RealtimeClient) {
    this.name = sanitizeChannelName(name);
    this.client = client;
    this.subscribers = new Set();
  }

  /**
   * Returns the unique identifier of the channel.
   * @returns The channel ID.
   */
  public getId() {
    return this.id;
  }

  /**
   * Emits an event to all subscribers, or manages internal state for success events.
   * @param eventName The event type.
   * @param data The payload to send to subscribers.
   */
  public emit(eventName: EventType, data: any) {
    if (eventName === "subscribe_success") {
      this.enabled = true;
      this.transition = null;
      return;
    }
    if (eventName === "unsubscribe_success") {
      this.enabled = false;
      this.transition = null;
      return;
    }
    for (let subscriber of this.subscribers) {
      subscriber.emit(eventName, data);
    }
  }

  /**
   * Subscribes to the channel and returns a SubscriptionClient for handler management.
   * @returns Promise resolving to a SubscriptionClient.
   */
  public async subscribe(): Promise<SubscriptionClient> {
    this.cancelStreamUnsubscribe(); // If scheduled, cancel
    await this.activate();
    let subscriber = new SubscriptionClient(this);
    this.subscribers.add(subscriber);
    return subscriber;
  }

  /**
   * Removes a subscriber and schedules channel disable if there are no more subscribers.
   * @param sub The SubscriptionClient to remove.
   */
  public unsubscribe(sub: SubscriptionClient) {
    const SubscriptionKeepAliveSec = 30;
    sub.clearHandlers();
    this.subscribers.delete(sub);

    if (this.subscribers.size == 0 && this.client.isConnected()) {
      // schedule deactivate in 30 secs
      // We must have come from at least one subscription, no scheduled deactivate for sure
      this.unsubscribeTimeout = setTimeout(() => {
        this.unsubscribeTimeout = null;
        this.deactivate();
      }, SubscriptionKeepAliveSec * 1000);
      try {
        this.unsubscribeTimeout.unref();
      } catch (_e) {}
    }
  }

  /**
   * Activates the reception of messages from the server for this channel.
   * Ensures connection and (re)subscribes if necessary.
   */
  public async activate(): Promise<void> {
    if (this.transition === "enabling") {
      return;
    }
    if (this.enabled && this.transition == null && this.client.isConnected()) {
      return;
    }
    // Other cases: not enabled, disabling, conn closed -> re-enable
    this.enabled = false;
    this.transition = "enabling";

    // Ensure connection is up
    await this.client.connect();

    // Let's reestablish subscription to server
    const payload = {
      id: this.id,
      type: "subscribe",
      channel: this.name,
      authorization: {
        host: this.client["host"],
        authorization: await this.client["auth"].getAuthorizationHeader(),
      },
    };
    this.client.send(payload);
  }

  /**
   * Immediately close remote subscription
   * No-op if already disabled.
   */
  public deactivate() {
    // Do nothing if disabled or disabling
    if (
      (!this.enabled && this.transition === null) ||
      this.transition === "disabling"
    ) {
      return;
    }
    this.transition = "disabling";

    const payload = {
      id: this.id,
      type: "unsubscribe",
      channel: this.name,
    };

    try {
      this.client.send(payload);
    } catch (error) {
      // Do nothing
    }
  }

  // if stream unsubscribe was scheduled, cancel it
  private cancelStreamUnsubscribe() {
    if (!this.unsubscribeTimeout) {
      return;
    }
    clearTimeout(this.unsubscribeTimeout);
    this.unsubscribeTimeout = null;
  }
}
