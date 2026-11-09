/** How to get the other pages of a list. Every list response from the API has it. */
export type Pagination = {
	/** The page size the API used, after the endpoint's default and maximum. */
	Limit: number;
	Links: {
		/** The first page, with the same filters and `Limit`. */
		First: { Href: string };
		/**
		 * Present only when more items are available. Absent on the last page, never `null`:
		 * its absence is the only sign that the list has ended. A page can be short, or even
		 * empty, and still have a `Next`.
		 */
		Next?: {
			/** The next page, with the same filters and `Limit`. */
			Href: string;
			/**
			 * Opaque cursor for the next page. Pass it unchanged as `cursor`, with the same
			 * filters. Do not parse, build or change it.
			 */
			Cursor: string;
		};
	};
};

/** Query parameters that every paginated list accepts. */
export type PaginationQueryParams = {
	/**
	 * Where to resume. Pass `Pagination.Links.Next.Cursor` from the previous page, unchanged,
	 * with the same filters. Only `limit` may change between pages.
	 */
	cursor?: string;
	/**
	 * Where to resume, from the previous page's `ContinuationKey`.
	 *
	 * @deprecated Use `cursor` with `Pagination.Links.Next.Cursor`. A `Next.Cursor` is not a
	 * valid `startKey`, nor the other way round.
	 */
	startKey?: string;
	/**
	 * Items per page. The API applies the endpoint's default and maximum, and reports the value
	 * it used in `Pagination.Limit`.
	 */
	limit?: number;
};

/** The pagination fields of a list response. */
export type PaginatedResponse = {
	/** Optional only because an API without paginated lists does not send it. */
	Pagination?: Pagination;
	/**
	 * Present only when more items are available. Pass it back as `startKey`.
	 *
	 * @deprecated Use `Pagination.Links.Next.Cursor` with `cursor`.
	 */
	ContinuationKey?: string;
};

/** The options of a `listAll()`: those of `list()`, without the cursor, which `listAll()` manages. */
export type ListAllOptions<Q> = Omit<Q, "cursor" | "startKey">;

/** The cursor for one page, as `paginate()` passes it to a page fetcher. */
export type PageCursor = Pick<PaginationQueryParams, "cursor" | "startKey">;

/** Query parameters of a list that was never paged by `startKey`: only `cursor` and `limit`. */
export type CursorQueryParams = Omit<PaginationQueryParams, "startKey">;

/** The pagination field of a list that never had `ContinuationKey`. */
export type CursorPaginatedResponse = Pick<PaginatedResponse, "Pagination">;

/** @deprecated Renamed `CursorQueryParams` in 5.0.0, with the `start` option renamed `cursor`. */
export type StartQueryParams = CursorQueryParams;

/** @deprecated Renamed `CursorPaginatedResponse` in 5.0.0. */
export type StartPaginatedResponse = CursorPaginatedResponse;
