import { createClient } from "../client/createClient";
import { CoresManager } from "./CoresManager";
import { CoreRequest } from "../types/cores";

describe("CoresManager", () => {
  let coresManager: CoresManager;
  const createdCores: string[] = []; // Track cores for cleanup

  beforeAll(() => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }

    const sdk = createClient({ method: "apiKey", key: apiKey });
    coresManager = sdk.cores;
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
      Class: "C0",
      Microarchitecture: "Athens",
      CorrelationTracking: "Disable",
      MemorySize: 256000,
      Precision: 128,
    };

    const core = await coresManager.create(payload);
    createdCores.push(core.CoreID); // Track for cleanup

    expect(core.CoreID).toBeDefined();
    expect(core.Name).toBe("Test Core");
    expect(core.Class).toBe("C0");
    expect(core.Microarchitecture).toBe("Athens");
    expect(core.CorrelationTracking).toBe("Disable");
    expect(core.MemorySize).toBe(256000);
    expect(core.Precision).toBe(128);
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
