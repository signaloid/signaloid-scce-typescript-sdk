export type SamplesResponse = {
	Samples: number[];
	Count: number;
	/** How many non-finite samples (NaN or infinity) the API dropped, when there were any. */
	NonFiniteCount?: number;
	ContinuationToken?: string;
};

export type SamplesQueryParams = {
	count?: number;
	taskID?: string;
	valueID?: string;
	continuationToken?: string;
};
