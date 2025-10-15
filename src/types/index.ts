export type ApiKeyAuth = { method: "apiKey"; key: string };
export type JwtAuth = { method: "jwt"; token: string };
export type EmailAuth = { method: "email" };

export type AuthOptions = ApiKeyAuth | JwtAuth | EmailAuth;
export type AuthMethod = AuthOptions["method"];

export type OverrideEndpoints = {
  api?: string;
  websocket?: string;
  host?: string;
};

export type ClientOptions = {
  overrideEndpoints?: OverrideEndpoints;
};

export type TraceVariable = {
  // Object: "TraceVariable",
  File: string;
  LineNumber: number;
  Expression: string;
};

export type ResourceType = "Gateway" | "Bucket" | "SignaloidCloudStorage";

export type DataSource = {
  ResourceID: string;
  ResourceType: ResourceType;
  Location: string;
};

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
export type * from "./things";
export type * from "./users";
export type * from "./subscriptions";
export type * from "./github";
export type * from "./plotting";
