export type KeyDetails = {
	Object: "Key";
	Key?: string;
	KeyID: string;
	Name: string;
	Owner: string;
	/** Unix timestamp in seconds, unlike the milliseconds of the Build and Task endpoints. */
	CreatedAt: number;
	/** Unix timestamp in seconds, or `null` for a key that never expires. */
	ValidUntil: number | null;
	OrganizationID?: string;
	DedicatedInstanceName?: string;
};

export type KeyRequest = {
	Name: string;
	/** Future Unix timestamp in seconds, not milliseconds. Omit it for a key that never expires. */
	ValidUntil?: number | null;
};

export type ListKeysResponse = {
	UserID: string;
	Keys: KeyDetails[];
	Count: number;
};
