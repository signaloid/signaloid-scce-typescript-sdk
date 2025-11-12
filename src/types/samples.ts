export type SamplesResponse = {
  Samples: number[];
  Count: number;
  ContinuationToken?: string;
};

export type SamplesQueryParams = {
  count?: number;
  taskID?: string;
  valueID?: string;
  continuationToken?: string;
};
