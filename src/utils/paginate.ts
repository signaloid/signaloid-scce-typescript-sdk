import { ERROR_CODES } from "../errors/codes";
import { SdkError } from "../errors/SdkError";
import { PageCursor, PaginatedResponse, PaginationQueryParams } from "../types/pagination";
import { refuseStartOption } from "./listParams";

/** The page size `listAll()` asks for: the largest that every list it reads allows. */
const MAX_PAGE_SIZE = 100;

/**
 * The cursor for the page after `page`, or undefined on the last page. Uses
 * `Pagination.Links.Next.Cursor` when the API sends `Pagination`, and the older
 * `ContinuationKey` otherwise, so it works against an API with or without paginated lists.
 * The list ends only when `Pagination.Links.Next` is absent, never on a short or empty page.
 */
export function nextCursor(page: PaginatedResponse): PageCursor | undefined {
	if (page.Pagination) {
		const next = page.Pagination.Links.Next;
		if (!next) return undefined;
		if (!next.Cursor) {
			// A malformed response. Ending here would return a short list without telling anyone.
			throw new SdkError(ERROR_CODES.API_FATAL, "The API sent a next page without a `Cursor`.");
		}
		return { cursor: next.Cursor };
	}
	return page.ContinuationKey ? { startKey: page.ContinuationKey } : undefined;
}

/**
 * Yields every page of a list, in order. `fetchPage` gets the cursor to send: `resumeAt` for the
 * first page, which is empty unless resuming a listing from a saved cursor. Send the same
 * filters with every page, as the API refuses a cursor sent with other filters. Keep paging past
 * short or empty pages: only the absence of a next cursor ends the list. A page that gets 503
 * with `Retry-After` is retried by the client itself. Throws an `SdkError` with code
 * `PAGINATION_STALLED` if the API returns the same cursor twice.
 *
 * @example
 * for await (const page of paginate((cursor) => client.tasks.list({ ...cursor, status: "Completed" }))) {
 *   console.log(page.Tasks.length);
 * }
 */
export async function* paginate<P extends PaginatedResponse>(
	fetchPage: (cursor: PageCursor) => Promise<P>,
	resumeAt: PageCursor = {},
): AsyncGenerator<P, void, undefined> {
	refuseStartOption(resumeAt);
	// Only the cursor fields count, in the same form nextCursor() returns, so the starting cursor
	// is recognized if the API echoes it back.
	let cursor: PageCursor | undefined = resumeAt.cursor
		? { cursor: resumeAt.cursor }
		: resumeAt.startKey
			? { startKey: resumeAt.startKey }
			: {};
	// nextCursor() never returns {}, so seeding it for the first page is harmless.
	const seen = new Set<string>([JSON.stringify(cursor)]);

	while (cursor) {
		const page: P = await fetchPage(cursor);
		yield page;

		cursor = nextCursor(page);
		if (cursor) {
			// An API that ignores the cursor would return the same page forever.
			const key = JSON.stringify(cursor);
			if (seen.has(key)) {
				throw new SdkError(
					ERROR_CODES.PAGINATION_STALLED,
					"The API returned the same cursor twice, so the list cannot advance.",
				);
			}
			seen.add(key);
		}
	}
}

/** Collects one array field from every page of a list. */
export async function collectAll<P extends PaginatedResponse, T>(
	fetchPage: (cursor: PageCursor) => Promise<P>,
	itemsOf: (page: P) => T[],
): Promise<T[]> {
	const items: T[] = [];
	for await (const page of paginate(fetchPage)) {
		items.push(...itemsOf(page));
	}
	return items;
}

/**
 * Every item of a list: what a manager's `listAll()` returns. Reads 100 items per page unless
 * `options.limit` says otherwise. Any cursor in `options` is dropped, so a stale one cannot
 * start the list mid-way, except the `start` of rc.3, which `list()` refuses.
 */
export function listAllItems<O extends PaginationQueryParams, P extends PaginatedResponse, T>(
	list: (query: O) => Promise<P>,
	options: O | undefined,
	itemsOf: (page: P) => T[],
): Promise<T[]> {
	const limit = options?.limit ?? MAX_PAGE_SIZE;
	return collectAll(
		(cursor) => list({ ...options, limit, cursor: undefined, startKey: undefined, ...cursor } as O),
		itemsOf,
	);
}
