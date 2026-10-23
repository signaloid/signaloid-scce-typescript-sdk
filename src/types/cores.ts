/**
 * Core classes that `POST /cores` and `PATCH /cores/{CoreID}` accept. Which of these an
 * account may use is tier-gated: see `CoreClasses` on `UserDetails`.
 */
export type CoreClass = "C0Pro" | "C0-microSD" | "C0-microSD-plus" | "C0-SD";

/**
 * Core classes a stored Core may carry. The retired `C0` still reads back and builds, but the
 * API refuses it on create and update. Migrate a `C0` Core by updating it with `Class: "C0Pro"`.
 */
export type StoredCoreClass = CoreClass | "C0";

/**
 * The C0-microSD, C0-microSD-plus and C0-SD classes support neither `Jupiter` nor `Reference`.
 * Which microarchitectures an account may use is tier-gated: see `Microarchitectures` on
 * `UserDetails`.
 */
export type Microarchitecture = "Athens" | "Atlas" | "Bypass" | "Reference" | "Jupiter";

/** `Jupiter`, `Bypass` and `Reference` accept `Disable` only. */
export type CorrelationTracking = "Autocorrelation" | "Disable";

export type CoreDetails = {
	Object: "Core";
	CoreID: string;
	Owner: string;
	CreatedAt: number;
	UpdatedAt: number;
	Name: string;
	Class: StoredCoreClass;
	Microarchitecture: Microarchitecture;
	CorrelationTracking: CorrelationTracking;
	/** In bytes. Fixed per Core class and assigned by the server. */
	MemorySize: number;
	Precision: number;
};

export type CoreRequest = {
	Name: string;
	Class: CoreClass;
	/** A power of two for `Athens` and `Jupiter`. Tier ceilings are in `UserDetails.Allowance`. */
	Precision: number;
	/** @deprecated Ignored: the server assigns `MemorySize` from the Core class. */
	MemorySize?: number;
	Microarchitecture: Microarchitecture;
	CorrelationTracking: CorrelationTracking;
};

/** `PATCH /cores/{CoreID}` takes the full Core body, with the same rules as `CoreRequest`. */
export type CorePatchRequest = CoreRequest;

export type ListCoresQueryParams = {
	default?: boolean;
	startKey?: string;
};

export type ListCoresResponse = {
	UserID: string;
	Count: number;
	ContinuationKey?: string;
	Cores: CoreDetails[];
};
