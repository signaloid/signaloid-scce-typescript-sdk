import type { OAuthOptions } from "./auth";

export type ApiKeyAuth = { method: "apiKey"; key: string };
export type JwtAuth = { method: "jwt"; token: string };
export type EmailAuth = { method: "email"; oauth?: OAuthOptions };

export type AuthOptions = ApiKeyAuth | JwtAuth | EmailAuth;
export type AuthMethod = AuthOptions["method"];

export type OverrideEndpoints = {
	api?: string;
	websocket?: string;
	host?: string;
	publicWebsocket?: string;
	publicHost?: string;
};

/** A Cognito user pool and an app client of that pool. */
export type CognitoOverrides = {
	userPoolId: string;
	userPoolClientId: string;
};

export type AuthManagerOptions = {
	cognito?: CognitoOverrides;
	manageAmplifyConfig?: boolean;
};

export type ClientOptions = RealtimeClientOptions & {
	overrideEndpoints?: OverrideEndpoints;
	/** Cognito pool in place of the environment's, for email sign-in only. Ignored, with a warning, when Amplify already uses another pool. */
	cognito?: CognitoOverrides;
	/** Set to false when the app configures Amplify itself, which makes `cognito` and `oauth` have no effect. The SDK also leaves alone an Amplify that the app has configured. */
	manageAmplifyConfig?: boolean;
};

export type RealtimeState = "idle" | "connecting" | "open" | "reconnecting" | "closed";

export type RealtimeStateChange = {
	state: RealtimeState;
	previous: RealtimeState;
	attempt: number;
	error?: unknown;
};

export type RealtimeClientOptions = {
	maxReconnectAttempts?: number;
};

export type TraceVariable = {
	// Object: "TraceVariable",
	File: string;
	LineNumber: number;
	Expression: string;
};

/** The API's confirmation on a create, update or delete that succeeded, such as "Core created successfully." */
export type SuccessMessage = { message: string };

/** `T` with every property optional, except that at least one must be present. */
export type AtLeastOne<T> = { [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>> }[keyof T];

export type ResourceType = "Bucket" | "Drive" | "SignaloidCloudStorage";

export type DataSource = {
	Object: "DataSource";
	ResourceID: string;
	ResourceType: ResourceType;
	/** A relative path inside the guest directory, such as "sd0". */
	Location: string;
};

export type * from "./auth";
export type * from "./builds";
export type * from "./tasks";
export type * from "./repositories";
export type * from "./cores";
export type * from "./webhooks";
export type * from "./files";
export type * from "./samples";
export type * from "./health";
export type * from "./buckets";
export type * from "./drives";
export type * from "./keys";
export type * from "./users";
export type * from "./subscriptions";
export type * from "./github";
export type * from "./organizations";
export type * from "./plotting";
export type * from "./tiers";
export type * from "./realtime";
export type * from "./pagination";
