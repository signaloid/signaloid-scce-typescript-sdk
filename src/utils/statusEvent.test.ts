import { parseStatusEvent } from "./statusEvent";

describe("parseStatusEvent", () => {
	test("reads a build event from the data envelope", () => {
		const msg = { data: { buildId: "bld_1", status: "Completed" } };
		expect(parseStatusEvent(msg, ["buildId", "BuildID"])).toEqual({ id: "bld_1", status: "Completed" });
	});

	test("falls back to the alternative ID key and Status casing", () => {
		const msg = { event: { BuildID: "bld_1", Status: "Stopped" } };
		expect(parseStatusEvent(msg, ["buildId", "BuildID"])).toEqual({ id: "bld_1", status: "Stopped" });
	});

	test("drops a status that is not a string", () => {
		const msg = { buildId: "bld_1", status: { value: "Completed" } };
		expect(parseStatusEvent(msg, ["buildId"]).status).toBeUndefined();
	});

	test("does not match a task event when looking for a build", () => {
		const msg = { taskId: "tsk_1", status: "Completed" };
		expect(parseStatusEvent(msg, ["buildId", "BuildID"]).id).toBeUndefined();
	});
});
