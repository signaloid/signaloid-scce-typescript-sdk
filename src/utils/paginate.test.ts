import { SdkError } from "../errors/SdkError";
import { ERROR_CODES } from "../errors/codes";
import { PageCursor, PaginatedResponse } from "../types/pagination";
import { paginationParams } from "./listParams";
import { collectAll, listAllItems, nextCursor, paginate } from "./paginate";
import { paginationBlock, stubClient } from "./testPages";
import { KeysManager } from "../keys/KeysManager";

type Page = PaginatedResponse & { Items: string[] };

// A page as an API with paginated lists returns it.
function newPage(items: string[], next?: string): Page {
	return { Items: items, Pagination: paginationBlock(next, 25) };
}

// A page as an older API returns it, with only ContinuationKey.
function oldPage(items: string[], continuationKey?: string): Page {
	return { Items: items, ...(continuationKey && { ContinuationKey: continuationKey }) };
}

function fetcher(pages: Record<string, Page>) {
	const cursors: PageCursor[] = [];
	const fetchPage = jest.fn(async (cursor: PageCursor) => {
		cursors.push(cursor);
		return pages[cursor.cursor ?? cursor.startKey ?? ""];
	});
	return { fetchPage, cursors };
}

describe("nextCursor", () => {
	it("uses Pagination.Links.Next.Cursor as cursor when the API sends Pagination", () => {
		expect(nextCursor({ ...newPage([], "tok"), ContinuationKey: "raw" })).toEqual({ cursor: "tok" });
	});

	it("ends the list when Pagination has no Next, even if a ContinuationKey is present", () => {
		expect(nextCursor({ ...newPage([]), ContinuationKey: "raw" })).toBeUndefined();
	});

	it("throws instead of ending the list when Next has no Cursor", () => {
		const page = newPage([]);
		page.Pagination!.Links.Next = { Href: "https://api.signaloid.io/x" } as never;
		expect(() => nextCursor(page)).toThrow(expect.objectContaining({ code: ERROR_CODES.API_FATAL }));
	});

	it("falls back to ContinuationKey as startKey when the API sends no Pagination", () => {
		expect(nextCursor(oldPage([], "raw"))).toEqual({ startKey: "raw" });
		expect(nextCursor(oldPage([]))).toBeUndefined();
	});
});

describe("paginate", () => {
	it("follows Next.Cursor past an empty page until Next is absent", async () => {
		const { fetchPage, cursors } = fetcher({
			"": newPage(["a"], "t1"),
			t1: newPage([], "t2"),
			t2: newPage(["b"]),
		});

		expect(await collectAll(fetchPage, (page) => page.Items)).toEqual(["a", "b"]);
		expect(cursors).toEqual([{}, { cursor: "t1" }, { cursor: "t2" }]);
	});

	it("follows ContinuationKey with startKey against an older API", async () => {
		const { fetchPage, cursors } = fetcher({ "": oldPage(["a"], "k1"), k1: oldPage(["b"]) });

		expect(await collectAll(fetchPage, (page) => page.Items)).toEqual(["a", "b"]);
		expect(cursors).toEqual([{}, { startKey: "k1" }]);
	});

	it("stops with an error instead of looping when the API repeats a cursor", async () => {
		const { fetchPage } = fetcher({ "": newPage(["a"], "same"), same: newPage(["b"], "same") });

		const result = collectAll(fetchPage, (page) => page.Items);
		await expect(result).rejects.toBeInstanceOf(SdkError);
		await expect(result).rejects.toMatchObject({
			code: ERROR_CODES.PAGINATION_STALLED,
			message: /same cursor twice/,
		});
	});

	it("resumes from a starting cursor", async () => {
		const { fetchPage, cursors } = fetcher({ t1: newPage(["b"], "t2"), t2: newPage(["c"]) });

		const items: string[] = [];
		for await (const page of paginate(fetchPage, { cursor: "t1" })) items.push(...page.Items);

		expect(items).toEqual(["b", "c"]);
		expect(cursors).toEqual([{ cursor: "t1" }, { cursor: "t2" }]);
	});

	it("recognizes an echoed starting cursor even when the starting object has other fields", async () => {
		const { fetchPage, cursors } = fetcher({ k0: oldPage(["a"], "k0") });
		const resumeAt = { startKey: "k0", limit: 50 } as PageCursor;

		await expect(
			(async () => {
				for await (const _page of paginate(fetchPage, resumeAt));
			})(),
		).rejects.toThrow(/same cursor twice/);
		expect(cursors).toEqual([{ startKey: "k0" }]);
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("yields whole pages for callers that need more than the items", async () => {
		const { fetchPage } = fetcher({ "": newPage(["a"], "t1"), t1: newPage(["b"]) });
		const sizes: number[] = [];
		for await (const page of paginate(fetchPage)) sizes.push(page.Items.length);
		expect(sizes).toEqual([1, 1]);
	});
});

describe("the rc.3 `start` cursor", () => {
	const renamed = {
		name: "SdkError",
		code: ERROR_CODES.API_BAD_REQUEST,
		message: "The `start` option is now `cursor`.",
	};

	it("is refused as a list option, rather than dropped, which would read the first page again", () => {
		expect(() => paginationParams({ start: "t5" } as never)).toThrow(expect.objectContaining(renamed));
	});

	it("is refused as the starting cursor of paginate(), rather than restart the list", async () => {
		const { fetchPage } = fetcher({ "": newPage(["a"]) });
		await expect(paginate(fetchPage, { start: "t5" } as never).next()).rejects.toMatchObject(renamed);
		expect(fetchPage).not.toHaveBeenCalled();
	});

	it("is refused in the options of a manager's listAll(), before any request", async () => {
		const { client, get } = stubClient({ "": { Keys: [], Pagination: paginationBlock() } });
		await expect(new KeysManager(client).listAll({ start: "t5" } as never)).rejects.toMatchObject(renamed);
		expect(get).not.toHaveBeenCalled();
	});
});

describe("paginationParams", () => {
	it("sends only the parameters that are set, and no limit below 1, which the API ignores", () => {
		expect(paginationParams()).toEqual({});
		expect(paginationParams({ cursor: "tok", limit: 50 })).toEqual({ cursor: "tok", limit: 50 });
		expect(paginationParams({ startKey: "raw", limit: 0 })).toEqual({ startKey: "raw" });
		expect(paginationParams({ cursor: "", startKey: "" })).toEqual({});
	});
});

describe("listAllItems", () => {
	type Query = { path?: string; cursor?: string; startKey?: string; limit?: number };

	it("asks for 100 per page unless the caller set limit, and keeps the other options", async () => {
		const list = jest.fn(async (_query: Query) => newPage(["a"]));

		await listAllItems(list, { path: "p" }, (page) => page.Items);
		await listAllItems(list, { limit: 10 }, (page) => page.Items);
		await listAllItems(list, undefined, (page) => page.Items);

		expect(list.mock.calls.map(([query]) => paginationParams(query))).toEqual([
			{ limit: 100 },
			{ limit: 10 },
			{ limit: 100 },
		]);
		expect(list.mock.calls[0][0].path).toBe("p");
	});

	it("drops a stale cursor from the options and sends each page's own cursor", async () => {
		const pages: Record<string, Page> = { "": newPage(["a"], "t1"), t1: newPage(["b"]) };
		const list = jest.fn(async (query: Query) => pages[query.cursor ?? ""]);

		const items = await listAllItems(list, { cursor: "stale", startKey: "older" }, (page) => page.Items);

		expect(items).toEqual(["a", "b"]);
		expect(list.mock.calls.map(([query]) => paginationParams(query))).toEqual([
			{ limit: 100 },
			{ cursor: "t1", limit: 100 },
		]);
	});
});
