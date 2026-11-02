import { createClient } from "../client/createClient";
import { CoresManager } from "./CoresManager";
import { SdkError } from "../errors/SdkError";
import { CoreClass, CoreDetails, CoreRequest, Microarchitecture } from "../types/cores";
import { UserDetails } from "../types/users";

// CI runs against a fixed integration-test account whose tier must cover every test, so a missing
// capability fails there instead of skipping the test unnoticed.
function tierPermits(user: UserDetails, coreClass: CoreClass, microarchitecture: Microarchitecture): boolean {
	const permitted =
		user.Microarchitectures.some((capability) => capability.Name === microarchitecture) &&
		user.CoreClasses.some(
			(capability) =>
				capability.Name === coreClass &&
				capability.SupportedMicroarchitectures.includes(microarchitecture),
		);
	if (!permitted) {
		const message = `This account's tier does not permit ${coreClass} with ${microarchitecture}`;
		if (process.env.CI) {
			throw new Error(message);
		}
		console.warn(`${message}, so the test is skipped`);
	}
	return permitted;
}

describe("CoresManager", () => {
	let coresManager: CoresManager;
	let user: UserDetails;
	const createdCores: string[] = []; // Track cores for cleanup

	// Takes `unknown` because most callers send a body the types refuse, standing in for a
	// caller without type checks.
	async function expectCreateRejected(payload: unknown): Promise<void> {
		const result = await coresManager.create(payload as CoreRequest).catch((e: unknown) => e);
		if (!(result instanceof SdkError)) {
			// The API accepted the Core, so clean it up before the assertion below fails.
			createdCores.push((result as CoreDetails).CoreID);
		}

		expect(result).toBeInstanceOf(SdkError);
		expect((result as SdkError).status).toBe(400);
	}

	beforeAll(async () => {
		const apiKey = process.env.SIGNALOID_USER_API_KEY;
		if (!apiKey) {
			throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
		}

		const sdk = createClient({ method: "apiKey", key: apiKey });
		coresManager = sdk.cores;
		user = await sdk.users.me();
	});

	afterAll(async () => {
		// Clean up any cores created during tests
		for (const coreId of createdCores) {
			try {
				await coresManager.delete(coreId);
			} catch (error) {
				console.warn(`Failed to cleanup core ${coreId}:`, error);
			}
		}
		createdCores.length = 0; // Clear the array
	});

	it("creates a core", async () => {
		const payload: CoreRequest = {
			Name: "Test Core",
			Class: "C0Pro",
			Microarchitecture: "Athens",
			DependencyTracking: "None",
			Precision: 128,
		};

		const core = await coresManager.create(payload);
		createdCores.push(core.CoreID); // Track for cleanup

		expect(core.CoreID).toBeDefined();
		expect(core.Name).toBe("Test Core");
		expect(core.Class).toBe("C0Pro");
		expect(core.Microarchitecture).toBe("Athens");
		expect(core.DependencyTracking).toBe("None");
		expect(core.MemorySize).toBe(8_192_000_000);
		expect(core.Precision).toBe(128);
	});

	it("creates a Jupiter core with Advanced dependency tracking", async () => {
		if (!tierPermits(user, "C0Pro", "Jupiter")) {
			return;
		}

		const core = await coresManager.create({
			Name: "Test Jupiter Core",
			Class: "C0Pro",
			Microarchitecture: "Jupiter",
			DependencyTracking: "Advanced",
			Precision: 128,
		});
		createdCores.push(core.CoreID);

		expect(core.Microarchitecture).toBe("Jupiter");
		expect(core.DependencyTracking).toBe("Advanced");
	});

	it("rejects a dependency tracking mode the microarchitecture does not support", async () => {
		// Athens is permitted with C0Pro, so a 400 can only be about the tracking mode.
		if (!tierPermits(user, "C0Pro", "Athens")) {
			return;
		}

		await expectCreateRejected({
			Name: "Test Core",
			Class: "C0Pro",
			Microarchitecture: "Athens",
			DependencyTracking: "Advanced",
			Precision: 128,
		});
	});

	it("creates an r7i core with the fixed Precision and dependency tracking filled in", async () => {
		if (!tierPermits(user, "r7i", "Native")) {
			return;
		}

		const core = await coresManager.create({
			Name: "Test r7i Core",
			Class: "r7i",
			Microarchitecture: "Native",
		});
		createdCores.push(core.CoreID);

		expect(core.Class).toBe("r7i");
		expect(core.Microarchitecture).toBe("Native");
		expect(core.Precision).toBe(0);
		expect(core.DependencyTracking).toBe("None");
		expect(core.MemorySize).toBe(8_192_000_000);
	});

	it("rejects a Precision other than 0 on an r7i core", async () => {
		if (!tierPermits(user, "r7i", "Native")) {
			return;
		}

		await expectCreateRejected({
			Name: "Test r7i Core",
			Class: "r7i",
			Microarchitecture: "Native",
			Precision: 128,
		});
	});

	it("creates a Bypass core with the fixed Precision filled in", async () => {
		if (!tierPermits(user, "C0Pro", "Bypass")) {
			return;
		}

		const core = await coresManager.create({
			Name: "Test Bypass Core",
			Class: "C0Pro",
			Microarchitecture: "Bypass",
			DependencyTracking: "None",
		});
		createdCores.push(core.CoreID);

		expect(core.Microarchitecture).toBe("Bypass");
		expect(core.Precision).toBe(0);
	});

	it("rejects a Precision other than 0 on a Bypass core", async () => {
		if (!tierPermits(user, "C0Pro", "Bypass")) {
			return;
		}

		await expectCreateRejected({
			Name: "Test Bypass Core",
			Class: "C0Pro",
			Microarchitecture: "Bypass",
			DependencyTracking: "None",
			Precision: 128,
		});
	});

	// Each Precision is valid for its class, so a 400 can only be about the microarchitecture.
	it.each([
		["C0Pro", "Native", 128],
		["r7i", "Athens", 0],
		["r7i", "Bypass", 0],
	])("rejects the %s class with the %s microarchitecture", async (coreClass, microarchitecture, precision) => {
		await expectCreateRejected({
			Name: "Test Core",
			Class: coreClass,
			Microarchitecture: microarchitecture,
			DependencyTracking: "None",
			Precision: precision,
		});
	});

	it("lists custom cores", async () => {
		const response = await coresManager.list();

		expect(response.Cores).toBeInstanceOf(Array);
		expect(typeof response.Count).toBe("number");
		expect(response.UserID).toBeDefined();
	});

	it("lists default cores", async () => {
		const response = await coresManager.list({ default: true });

		expect(response.Cores).toBeInstanceOf(Array);
		expect(response.Cores.length).toBeGreaterThan(0);
		expect(response.UserID).toBeDefined();
	});

	it("gets core details", async () => {
		const cores = await coresManager.list();
		if (cores.Cores.length === 0) {
			console.warn("No cores available for testing");
			return;
		}

		const coreId = cores.Cores[0].CoreID;
		const core = await coresManager.getOne(coreId);

		expect(core.CoreID).toBe(coreId);
		expect(core.Name).toBeDefined();
		expect(core.Class).toBeDefined();
		expect(core.Microarchitecture).toBeDefined();
	});

	it("handles non-existent core", async () => {
		await expect(coresManager.getOne("invalid-core-id")).rejects.toThrow();
	});
});
