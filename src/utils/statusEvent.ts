import type { RealtimeEvent } from "../types/realtime";

/**
 * Reads the entity ID and status from a `task-status` or `build-status` realtime event.
 * Anything that is not a string reads as undefined, so a malformed event never matches.
 */
export function parseStatusEvent(
	event: RealtimeEvent | undefined,
	idKey: "TaskID" | "BuildID",
): { id?: string; status?: string } {
	const id = event?.Data?.[idKey];
	const status = event?.Data?.Status;
	return {
		id: typeof id === "string" ? id : undefined,
		status: typeof status === "string" ? status : undefined,
	};
}
