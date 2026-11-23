import type { BuildStatusTransition } from "../types/builds";
import type { TaskStatusTransition } from "../types/tasks";

/**
 * The code that says why a Task or Build stopped, such as `ErrMaxDurationExceeded` when it ran
 * longer than its `MaxDurationSeconds`, or `ErrTimeout` when it ran longer than the platform
 * maximum of 8 hours. Other codes include `ErrCancelled`, `ErrOutOfMemory`, `ErrNonZeroExit`
 * and `ErrInternal`.
 *
 * Signaloid Cloud writes the code at the start of the message of the last status transition,
 * as in "ErrMaxDurationExceeded: Your program ran longer than...". This returns `undefined`
 * when that message carries no code, as for a Task or Build that completed.
 */
export function getStopReason(details: {
	StatusTransitions?: (TaskStatusTransition | BuildStatusTransition)[];
}): string | undefined {
	const transitions = details.StatusTransitions ?? [];
	const message = transitions[transitions.length - 1]?.Message;
	return message?.match(/^\s*(Err\w+):/)?.[1];
}
