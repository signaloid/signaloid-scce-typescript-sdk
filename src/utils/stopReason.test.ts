import { getStopReason } from "./stopReason";

function withLastMessage(Message?: string) {
	return {
		StatusTransitions: [
			{
				Status: "In Progress" as const,
				Timestamp: 1,
				Message: "ErrTimeout: an earlier message that must be ignored.",
			},
			{ Status: "Stopped" as const, Timestamp: 2, Message },
		],
	};
}

describe("getStopReason", () => {
	it("returns the code that starts the last transition message", () => {
		expect(
			getStopReason(
				withLastMessage(
					"ErrMaxDurationExceeded: Your program ran longer than the MaxDurationSeconds set when the task was created, and was terminated by the Signaloid Compute Engine.",
				),
			),
		).toBe("ErrMaxDurationExceeded");
	});

	it("accepts digits and underscores in the code, and leading whitespace", () => {
		expect(getStopReason(withLastMessage(" ErrHTTP_5xx: The request failed."))).toBe("ErrHTTP_5xx");
	});

	it("returns undefined for a message without a code", () => {
		expect(getStopReason(withLastMessage("Task completed."))).toBeUndefined();
	});

	it("returns undefined for a last transition without a message", () => {
		expect(getStopReason(withLastMessage(undefined))).toBeUndefined();
	});

	it("returns undefined without transitions", () => {
		expect(getStopReason({})).toBeUndefined();
		expect(getStopReason({ StatusTransitions: [] })).toBeUndefined();
	});
});
