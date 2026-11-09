import type { ListAllOptions, PaginatedResponse, PaginationQueryParams } from "./pagination";

/**
 * Core classes that `POST /cores` and `PATCH /cores/{CoreID}` accept. Apart from the
 * `NativeCoreClass` ones, which of these an account may use is tier-gated: see `CoreClasses`
 * on `UserDetails`.
 */
export type CoreClass = "C0Pro" | NativeCoreClass | "C0-microSD" | "C0-microSD-plus" | "C0-SD";

/**
 * Core classes that build with a stock host toolchain and run without uncertainty tracking.
 * Their Cores have a fixed `Precision` of 0 and `DependencyTracking` of `None`, accept only the
 * `Native` microarchitecture, and their builds may not discover or trace variables. Their Tasks produce no Ux values. Every tier may use them.
 */
export type NativeCoreClass = "r7i";

/** Microarchitectures valid only with a `NativeCoreClass`. */
export type NativeMicroarchitecture = "Native";

/**
 * Core classes a stored Core may carry. The retired `C0` still reads back and builds, but the
 * API refuses it on create and update. Migrate a `C0` Core by updating it with `Class: "C0Pro"`.
 */
export type StoredCoreClass = CoreClass | "C0";

/**
 * `Athens`, `Rome`, `Jupiter`, `Mercury` and `Europa` are the distribution-tracking
 * microarchitectures. `Jupiter`, `Mercury` and `Europa` are for the `C0Pro` class only. The
 * C0-microSD, C0-microSD-plus and C0-SD classes support only `Athens`, `Rome` and `Bypass`.
 * The `r7i` class supports only `Native`, and `Native` is valid with no other
 * class. Which microarchitectures an account may use is tier-gated: see `Microarchitectures`
 * and `CoreClasses` on `UserDetails`. The Free tier does not get `Mercury` or `Europa`, so the
 * API refuses a Core, build or Repository on them from a Free account with 403.
 */
export type Microarchitecture =
	| "Athens"
	| "Rome"
	| "Bypass"
	| "Reference"
	| "Jupiter"
	| "Mercury"
	| "Europa"
	| NativeMicroarchitecture;

/**
 * Microarchitectures a stored Core or build may carry. `Atlas` is retired: the API refuses it on
 * create and update, but Cores and builds made before `Rome` replaced it can still report it.
 */
export type StoredMicroarchitecture = Microarchitecture | "Atlas";

/**
 * `Athens` and `Rome` accept `None` or `Basic`. `Jupiter`, `Mercury` and `Europa` accept only
 * `Advanced`. `Bypass`, `Reference` and `Native` accept only `None`. The supported modes per microarchitecture are
 * also in `Microarchitectures` on `UserDetails`.
 */
export type DependencyTracking = "None" | "Basic" | "Advanced";

/** The modes of `CorrelationTracking`, which the API renamed to `DependencyTracking`. */
export type LegacyCorrelationTracking = "Autocorrelation" | "Disable";

export type CoreDetails = {
	Object: "Core";
	CoreID: string;
	Owner: string;
	CreatedAt: number;
	UpdatedAt: number;
	Name: string;
	Class: StoredCoreClass;
	Microarchitecture: StoredMicroarchitecture;
	/** Set on Cores created or updated since the API renamed `CorrelationTracking` to `DependencyTracking`. */
	DependencyTracking?: DependencyTracking;
	/** @deprecated Set only on older Cores. Update the Core with a `DependencyTracking` mode to migrate it. */
	CorrelationTracking?: LegacyCorrelationTracking;
	/** In bytes. Fixed per Core class and assigned by the server. */
	MemorySize: number;
	/** Always 0 for a `NativeCoreClass` and for the `Bypass` microarchitecture. */
	Precision: number;
};

type CoreRequestBase = {
	Name: string;
	/** @deprecated Ignored: the server assigns `MemorySize` from the Core class. */
	MemorySize?: number;
};

/** A Core of a class that tracks uncertainty, on a microarchitecture that takes a `Precision`. */
export type UncertainCoreRequest = CoreRequestBase & {
	Class: Exclude<CoreClass, NativeCoreClass>;
	/**
	 * A power of two from 4 to 8192 for the distribution-tracking microarchitectures (see
	 * `Microarchitecture`), and from 4 to 1000000 for `Reference`. Tier ceilings are in
	 * `UserDetails.Allowance`.
	 */
	Precision: number;
	Microarchitecture: Exclude<Microarchitecture, NativeMicroarchitecture | "Bypass">;
	DependencyTracking: DependencyTracking;
};

/**
 * A Core on the `Bypass` microarchitecture, which ignores `Precision`. The API fills in a
 * `Precision` of 0 when it is left out, and refuses any other value with 400.
 */
export type BypassCoreRequest = CoreRequestBase & {
	Class: Exclude<CoreClass, NativeCoreClass>;
	Precision?: 0;
	Microarchitecture: "Bypass";
	DependencyTracking: "None";
};

/**
 * A Core of a `NativeCoreClass`. The API fills in `Precision` and `DependencyTracking` when they
 * are left out, and refuses any other value with 400.
 */
export type NativeCoreRequest = CoreRequestBase & {
	Class: NativeCoreClass;
	Precision?: 0;
	Microarchitecture: NativeMicroarchitecture;
	DependencyTracking?: "None";
};

export type CoreRequest = UncertainCoreRequest | BypassCoreRequest | NativeCoreRequest;

/** `PATCH /cores/{CoreID}` takes the full Core body, with the same rules as `CoreRequest`. */
export type CorePatchRequest = CoreRequest;

export type ListCoresQueryParams = PaginationQueryParams & {
	/**
	 * List the default Cores instead of the caller's own. The API leaves out default Cores the
	 * caller's tier cannot use, after it reads a page, so a page can be short or even empty and
	 * still have a `Pagination.Links.Next`. Keep paging until `Pagination.Links.Next` is absent,
	 * or use `cores.listAll()`, which does.
	 */
	default?: boolean;
};

/** Options for `cores.listAll()`, which manages the cursor itself. */
export type ListAllCoresOptions = ListAllOptions<ListCoresQueryParams>;

export type ListCoresResponse = PaginatedResponse & {
	UserID: string;
	Count: number;
	Cores: CoreDetails[];
};
