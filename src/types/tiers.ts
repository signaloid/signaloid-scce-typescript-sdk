import type { CoreClass, CorrelationTracking, Microarchitecture } from "./cores";
import type { SubscribableTier } from "./subscriptions";

/** Subscription tiers an account or organization may be on. */
export type Tier = SubscribableTier | "DeveloperTier" | "AcademicTier" | "EnterpriseTier";

/**
 * What a tier permits, keyed to pair with `ResourceUsage`: one entry per usage counter, in
 * the same unit, plus the Core ceilings that have no counter. A counter limit that does not
 * apply on the tier is absent, so treat a missing key as "no limit". A value at or above
 * `UNLIMITED_LIMIT_THRESHOLD` also means unlimited.
 */
export type Allowance = {
	APIAccessCount?: number;
	BucketCount?: number;
	BuildTimeInMillisecondsCount?: number;
	CloudStorageBytes?: number;
	ConcurrentBuildCount?: number;
	ConcurrentTaskCount?: number;
	CoreCount?: number;
	DataDriveCount?: number;
	DataSourceCount?: number;
	DynamicInstructionCount?: number;
	ExecutionTimeInMillisecondsCount?: number;
	GatewayCount?: number;
	KeyCount?: number;
	PlotCount?: number;
	RegistryStorageBytes?: number;
	RepositoryCount?: number;
	/** Highest `Precision` for the `Athens`, `Atlas` and `Jupiter` microarchitectures. */
	MaxPrecisionBits: number;
	/** Highest `Precision` for the `Reference` microarchitecture. */
	MaxReferenceQuality: number;
	/** Highest Core `MemorySize`, in bytes. */
	MaximumAttachedProcessorRam: number;
};

/** A Core class the account may create, with the microarchitectures it may be paired with. */
export type CoreClassCapability = {
	Name: CoreClass;
	SupportedMicroarchitectures: Microarchitecture[];
};

/** A microarchitecture the account's tier grants, and what it supports. */
export type MicroarchitectureCapability = {
	Name: Microarchitecture;
	DistributionTracking: boolean;
	CustomPrecision: boolean;
	PrecisionMustBePowerOfTwo: boolean;
	CorrelationTracking: CorrelationTracking[];
};

/** Platform-wide bounds on the numeric Core fields, before any tier ceiling applies. */
export type FieldConstraints = {
	MemorySize: { Minimum: number; Maximum: number };
	Precision: { Minimum: number; Maximum: number };
};

/** The capability fields `GET /users/{UserID}` and `GET /organizations/{OrganizationID}` add. */
export type TierCapabilities = {
	Allowance: Allowance;
	CoreClasses: CoreClassCapability[];
	Microarchitectures: MicroarchitectureCapability[];
	FieldConstraints: FieldConstraints;
};

/**
 * The limits a tier advertises. A limit that does not apply on the tier is `null`, and a value
 * at or above `UNLIMITED_LIMIT_THRESHOLD` means unlimited.
 */
export type TierLimits = {
	APIAccessCount: number | null;
	AuditableZeroDataRetention: boolean;
	BucketCount: number | null;
	BuildTimeInMillisecondsCount: number | null;
	CloudStorageBytes: number | null;
	ConcurrentBuildCount: number | null;
	ConcurrentTaskCount: number | null;
	CoreAvailableMicroarchitectures: Microarchitecture[];
	CoreCount: number | null;
	CoreMemorySizeBytesMaximum: number;
	CorePrecisionBits: number;
	CoreReferenceQuality: number;
	DataDriveCount: number | null;
	DataSourceCount: number | null;
	DedicatedSingleTenancyPrivateServerOption: boolean;
	ExecutionTimeInMillisecondsCount: number | null;
	GatewayCount: number | null;
	KeyCount: number | null;
	PlotCount: number | null;
	ProCoreVariants: boolean;
	RegistryStorageBytesMaximum: number | null;
	RepositoryCount: number | null;
};

export type TierEntry = {
	Tier: Tier;
	Limits: TierLimits;
};

/** Every tier, cheapest first. */
export type ListTiersResponse = TierEntry[];
