export class SdkError extends Error {
	public code: string;
	public details?: unknown;
	public status?: number;
	/** The short error label the API sent, such as "ConcurrencyLimitExceeded", if any. */
	public errorType?: string;
	/** Seconds to wait before retrying, from the `Retry-After` header when the API sends one. */
	public retryAfter?: number;

	constructor(
		code: string,
		message: string,
		details?: unknown,
		status?: number,
		extras?: { errorType?: string; retryAfter?: number },
	) {
		super(message);
		this.code = code;
		this.details = details;
		this.status = status;
		this.errorType = extras?.errorType;
		this.retryAfter = extras?.retryAfter;
		this.name = "SdkError";
	}
}
