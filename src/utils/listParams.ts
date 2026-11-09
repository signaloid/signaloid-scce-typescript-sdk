import { ERROR_CODES } from "../errors/codes";
import { SdkError } from "../errors/SdkError";
import type { PaginationQueryParams } from "../types/pagination";

/**
 * Throws if `options` has the `start` cursor of the 5.0.0 release candidates up to rc.3, which
 * is now `cursor`. Dropping it would read the list again from the first page, without an error.
 */
export function refuseStartOption(options: object | undefined): void {
	if (options && (options as { start?: unknown }).start !== undefined) {
		throw new SdkError(ERROR_CODES.API_BAD_REQUEST, "The `start` option is now `cursor`.");
	}
}

export function serializeListParams(params: Record<string, any>): string {
	const searchParams = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (Array.isArray(value)) {
			for (const v of value) searchParams.append(key, v);
		} else if (value !== undefined) {
			searchParams.append(key, String(value));
		}
	}
	return searchParams.toString();
}

/** The `cursor`, `startKey` and `limit` query parameters of a paginated list, when set. */
export function paginationParams(options?: PaginationQueryParams): Record<string, string | number> {
	refuseStartOption(options);
	const params: Record<string, string | number> = {};
	if (options?.cursor) params.cursor = options.cursor;
	if (options?.startKey) params.startKey = options.startKey;
	// The API gives a limit below 1 its default, so sending it would change nothing.
	if (options?.limit !== undefined && options.limit > 0) params.limit = options.limit;
	return params;
}

/** `paginationParams`, plus the `from`, `to` and `status` filters of the lists ordered by creation time. */
export function timeFilteredListParams(
	options?: PaginationQueryParams & { from?: string; to?: string; status?: string | string[] },
): Record<string, string | number | string[]> {
	const params: Record<string, string | number | string[]> = paginationParams(options);
	if (options?.from) params.from = options.from;
	if (options?.to) params.to = options.to;
	if (options?.status) params.status = options.status;
	return params;
}

/** Reads a string argument as the deprecated `startKey`, as some older list methods accept. */
export function withLegacyStartKey<T extends PaginationQueryParams>(
	options?: T | string,
): T | PaginationQueryParams | undefined {
	return typeof options === "string" ? { startKey: options } : options;
}
