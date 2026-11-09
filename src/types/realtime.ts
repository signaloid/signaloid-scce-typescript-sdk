import type { BuildStatus } from "./builds";
import type { TaskStatus } from "./tasks";

/**
 * An event as a realtime channel delivers it, after the SDK parses the AppSync `event`
 * string. `EventType` names the channel kind, such as `task-status` or `build-stats`.
 */
export type RealtimeEvent = {
	EventType: string;
	Timestamp: string;
	Data: Record<string, unknown>;
};

type StatusEventData<S> = { Status: S; Message?: string; UpdatedAt: string };

/** `Data` of a `task-status` or `public-task-status` event. Webhook deliveries carry the same. */
export type TaskStatusEventData = StatusEventData<TaskStatus> & { TaskID: string };

/** `Data` of a `build-status` event. Webhook deliveries carry the same. */
export type BuildStatusEventData = StatusEventData<BuildStatus> & { BuildID: string };

/** `Data` of a `task-stats`, `build-stats`, `task-count` or `build-count` event. Webhook deliveries carry the same. */
export type UsageEventData = { UserID: string; Object: "User"; ResourceUsage: Record<string, number> };
