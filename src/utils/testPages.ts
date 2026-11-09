// Fixtures for unit tests of paginated lists. tsconfig.json leaves it out of the SDK build.
import type { AxiosInstance } from "axios";
import type { Pagination } from "../types/pagination";

/** A `Pagination` block, with a `Next` cursor when one is given. */
export function paginationBlock(next?: string, limit = 100): Pagination {
	return {
		Limit: limit,
		Links: { First: { Href: "f" }, ...(next && { Next: { Href: "n", Cursor: next } }) },
	};
}

/**
 * A stub axios `get` that answers each request with the page for the cursor it sent: its
 * `cursor`, else its `startKey`, else "" for the first page.
 */
export function stubGet(pages: Record<string, unknown>) {
	return jest.fn(async (_url: string, config?: { params?: Record<string, unknown> }) => ({
		data: pages[String(config?.params?.cursor ?? config?.params?.startKey ?? "")],
	}));
}

/** An axios client whose `get` is `stubGet(pages)`, and that `get`, to inspect its calls. */
export function stubClient(pages: Record<string, unknown>) {
	const get = stubGet(pages);
	return { client: { get } as unknown as AxiosInstance, get };
}
