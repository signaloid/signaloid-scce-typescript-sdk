import { createClient } from "../client/createClient";
import { ListTiersResponse, TierLimits } from "../types/tiers";

const tierLimitKeys: Record<keyof TierLimits, true> = {
	APIAccessCount: true,
	AuditableZeroDataRetention: true,
	BucketCount: true,
	BuildTimeInMillisecondsCount: true,
	CloudStorageBytes: true,
	ConcurrentBuildCount: true,
	ConcurrentTaskCount: true,
	CoreAvailableMicroarchitectures: true,
	CoreCount: true,
	CoreMemorySizeBytesMaximum: true,
	CorePrecisionBits: true,
	CoreReferenceQuality: true,
	DataDriveCount: true,
	DataSourceCount: true,
	DedicatedSingleTenancyPrivateServerOption: true,
	ExecutionTimeInMillisecondsCount: true,
	GatewayCount: true,
	KeyCount: true,
	PlotCount: true,
	ProCoreVariants: true,
	RegistryStorageBytesMaximum: true,
	RepositoryCount: true,
};

describe("TiersManager", () => {
	let tiers: ListTiersResponse;

	beforeAll(async () => {
		const apiKey = process.env.SIGNALOID_USER_API_KEY;
		if (!apiKey) {
			throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
		}

		const sdk = createClient({ method: "apiKey", key: apiKey });
		tiers = await sdk.tiers.list();
	});

	it("lists every tier, cheapest first", () => {
		expect(tiers.length).toBeGreaterThan(0);
		expect(tiers[0].Tier).toBe("FreeTier");
	});

	it("serves exactly the typed limits", () => {
		for (const entry of tiers) {
			expect(Object.keys(entry.Limits).sort()).toEqual(Object.keys(tierLimitKeys).sort());
		}
	});
});
