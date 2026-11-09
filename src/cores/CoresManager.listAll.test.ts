import { CoresManager } from "./CoresManager";
import { CoreDetails, ListCoresResponse } from "../types/cores";
import { paginationBlock, stubClient } from "../utils/testPages";

// Pages as the API returns them for `GET /cores?default`, where the tier filter can empty a page.
function page(coreIDs: string[], continuationKey?: string): ListCoresResponse {
	return {
		UserID: "*",
		Count: coreIDs.length,
		ContinuationKey: continuationKey,
		Cores: coreIDs.map((CoreID) => ({ CoreID }) as CoreDetails),
	};
}

describe("CoresManager.listAll", () => {
	it("pages past an empty page until ContinuationKey is absent", async () => {
		const { client, get } = stubClient({ "": page(["a"], "1"), "1": page([], "2"), "2": page(["b", "c"]) });

		const cores = await new CoresManager(client).listAll({ default: true });

		expect(cores.map((core) => core.CoreID)).toEqual(["a", "b", "c"]);
		expect(get.mock.calls.map(([, config]) => config?.params)).toEqual([
			{ default: "true", limit: 100 },
			{ default: "true", limit: 100, startKey: "1" },
			{ default: "true", limit: 100, startKey: "2" },
		]);
	});

	it("makes one request when the first page is the last", async () => {
		const { client, get } = stubClient({ "": page([]) });

		expect(await new CoresManager(client).listAll()).toEqual([]);
		expect(get).toHaveBeenCalledTimes(1);
	});
});

describe("CoresManager.listAll with Pagination", () => {
	it("follows Pagination.Links.Next.Cursor with cursor, not ContinuationKey", async () => {
		const pages: Record<string, ListCoresResponse> = {
			"": {
				UserID: "*",
				Count: 1,
				ContinuationKey: "raw-key",
				Cores: [{ CoreID: "a" } as CoreDetails],
				Pagination: paginationBlock("tok", 25),
			},
			tok: {
				UserID: "*",
				Count: 1,
				Cores: [{ CoreID: "b" } as CoreDetails],
				Pagination: paginationBlock(undefined, 25),
			},
		};
		const { client, get } = stubClient(pages);

		const cores = await new CoresManager(client).listAll({ default: true });

		expect(cores.map((core) => core.CoreID)).toEqual(["a", "b"]);
		expect(get.mock.calls.map(([, config]) => config?.params)).toEqual([
			{ default: "true", limit: 100 },
			{ default: "true", limit: 100, cursor: "tok" },
		]);
	});
});
