import { parseStatusEvent } from "./statusEvent";

const event = (Data: Record<string, unknown>) => ({ EventType: "build-status", Timestamp: "t", Data });

describe("parseStatusEvent", () => {
	test("reads a build event", () => {
		expect(parseStatusEvent(event({ BuildID: "bld_1", Status: "Completed" }), "BuildID")).toEqual({
			id: "bld_1",
			status: "Completed",
		});
	});

	test("drops a status that is not a string", () => {
		expect(
			parseStatusEvent(event({ BuildID: "bld_1", Status: { value: "Completed" } }), "BuildID").status,
		).toBeUndefined();
	});

	test("does not match a task event when looking for a build", () => {
		expect(parseStatusEvent(event({ TaskID: "tsk_1", Status: "Completed" }), "BuildID").id).toBeUndefined();
	});

	test("tolerates a missing event", () => {
		expect(parseStatusEvent(undefined, "TaskID")).toEqual({ id: undefined, status: undefined });
	});
});
