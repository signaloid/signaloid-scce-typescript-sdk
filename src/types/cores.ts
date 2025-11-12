export type CoreClass = "C0" | "C0Pro" | "C0-microSD" | "C0-microSD-plus";

export type Microarchitecture =
  | "Zurich"
  | "Athens"
  | "Bypass"
  | "Reference"
  | "Jupiter";

export type CorrelationTracking = "Autocorrelation" | "Disable";

export type CoreDetails = {
  Object: "Core";
  CoreID: string;
  Owner: string;
  CreatedAt: number;
  UpdatedAt: number;
  Name: string;
  Class: CoreClass;
  Microarchitecture: Microarchitecture;
  CorrelationTracking: CorrelationTracking;
  MemorySize: number;
  Precision: number;
};

export type CoreRequest = {
  Name: string;
  Class: CoreClass;
  Precision: number;
  MemorySize: number;
  Microarchitecture: Microarchitecture;
  CorrelationTracking: CorrelationTracking;
};

export type CorePatchRequest = {
  Name: string;
  Class: CoreClass;
  Precision: number;
  MemorySize: number;
  Microarchitecture: Microarchitecture;
  CorrelationTracking: CorrelationTracking;
};

export type ListCoresQueryParams = {
  default?: boolean;
};

export type ListCoresResponse = {
  UserID: string;
  Count: number;
  ContinuationKey?: string;
  Cores: CoreDetails[];
};
