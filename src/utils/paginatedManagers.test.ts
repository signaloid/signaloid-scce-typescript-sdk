import { BuildsManager } from "../builds/BuildsManager";
import { KeysManager } from "../keys/KeysManager";
import { OrganizationsManager } from "../organizations/OrganizationsManager";
import type { OrganizationPendingUser, OrganizationUser } from "../types/organizations";
import { UsersManager } from "../users/UsersManager";
import { WebhooksManager } from "../webhooks/WebhooksManager";
import { paginationBlock, stubClient } from "./testPages";

// A page as the API returns it, with a Next token when one is given.
function page<T extends object>(body: T, next?: string) {
	return { ...body, Pagination: paginationBlock(next) };
}

describe("paginated listings", () => {
	it("keys.listAll reads every page, 100 at a time", async () => {
		const { client, get } = stubClient({
			"": page({ UserID: "u", Keys: [{ KeyID: "a" }], Count: 1 }, "t1"),
			t1: page({ UserID: "u", Keys: [{ KeyID: "b" }], Count: 1 }),
		});

		const keys = await new KeysManager(client).listAll();

		expect(keys.map((key) => key.KeyID)).toEqual(["a", "b"]);
		expect(get.mock.calls.map(([, config]) => config?.params)).toEqual([
			{ limit: 100 },
			{ limit: 100, cursor: "t1" },
		]);
	});

	it("webhooks.list sends cursor and limit", async () => {
		const { client, get } = stubClient({ tok: page({ Webhooks: [], Count: 0 }) });
		await new WebhooksManager(client).list({ cursor: "tok", limit: 10 });
		expect(get).toHaveBeenCalledWith("/webhooks", { params: { cursor: "tok", limit: 10 } });
	});

	it("organizations.listAllUsers pages one list, with its status on every request", async () => {
		const { client, get } = stubClient({
			"": page({ Users: [{ Email: "a@x" }], Count: 1 }, "t1"),
			t1: page({ Users: [{ Email: "b@x" }], Count: 1 }),
		});

		const users = await new OrganizationsManager(client).listAllUsers("org_1", { status: "Pending" });

		expect(users.map((user) => user.Email)).toEqual(["a@x", "b@x"]);
		expect(get.mock.calls.map(([, config]) => config?.params?.status)).toEqual(["Pending", "Pending"]);
	});

	it("builds.getVariables reads a string argument as the deprecated startKey", async () => {
		const { client, get } = stubClient({ "raw-key": page({ BuildID: "b", Variables: [], Count: 0 }) });
		await new BuildsManager(client, {} as never, {} as never, {} as never).getVariables("bld_1", "raw-key");
		expect(get).toHaveBeenCalledWith("/builds/bld_1/variables", { params: { startKey: "raw-key" } });
	});

	it("users.getLogs sends cursor and limit with the time window", async () => {
		const { client, get } = stubClient({ tok: page({ logs: [], totalResults: 0 }) });
		await new UsersManager(client).getLogs("usr_1", { cursor: "tok", limit: 50, startTime: 1000 });
		expect(get).toHaveBeenCalledWith("/users/usr_1/logs", {
			params: { cursor: "tok", limit: 50, startTime: 1000 },
		});
	});

	it("users.getLogs sends a start time of 0", async () => {
		const { client, get } = stubClient({ "": page({ logs: [], totalResults: 0 }) });
		await new UsersManager(client).getLogs("usr_1", { startTime: 0 });
		expect(get).toHaveBeenCalledWith("/users/usr_1/logs", { params: { startTime: 0 } });
	});

	it("organizations.listUsers keeps only the list asked for from an API without paginated lists", async () => {
		const legacy = { Users: [{ Email: "active@x" }], Pending: [{ Email: "pending@x" }], TotalCount: 2 };
		const { client } = stubClient({ "": legacy });
		const orgs = new OrganizationsManager(client);

		expect(await orgs.listUsers("org_1", { status: "Pending" })).toEqual({
			Users: [{ Email: "pending@x" }],
			Count: 1,
		});
		expect(await orgs.listUsers("org_1")).toEqual({ Users: [{ Email: "active@x" }], Count: 1 });
	});

	it("organizations.listUsers finds no invitations in a legacy response without Pending", async () => {
		const { client } = stubClient({ "": { Users: [{ Email: "active@x" }], TotalCount: 1 } });
		expect(await new OrganizationsManager(client).listUsers("org_1", { status: "Pending" })).toEqual({
			Users: [],
			Count: 0,
		});
	});

	it("organizations.listUsers and listAllUsers return the type that status selects", async () => {
		const { client } = stubClient({
			"": page({ Users: [{ UserID: "usr_1", Status: "Active" }], Count: 1 }),
		});
		const orgs = new OrganizationsManager(client);

		// These assignments compile only because the result is narrowed by status.
		const members: OrganizationUser[] = await orgs.listAllUsers("org_1");
		expect(members[0].UserID).toBe("usr_1");
		const invitations: OrganizationPendingUser[] = (await orgs.listUsers("org_1", { status: "Pending" }))
			.Users;
		expect(invitations).toHaveLength(1);
		// @ts-expect-error Active members are not pending invitations.
		const wrong: OrganizationPendingUser[] = await orgs.listAllUsers("org_1", { status: "Active" });
		expect(wrong).toBeDefined();
	});

	it("organizations.listUsers always sends status, so the API pages the list", async () => {
		const { client, get } = stubClient({ "": page({ Users: [], Count: 0 }) });
		await new OrganizationsManager(client).listUsers("org_1");
		expect(get).toHaveBeenCalledWith("/organizations/org_1/users", { params: { status: "Active" } });
	});
});
