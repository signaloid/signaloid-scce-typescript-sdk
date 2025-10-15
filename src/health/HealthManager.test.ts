import { createClient } from "../client/createClient";
import { HealthManager } from "./HealthManager";

describe("HealthManager", () => {
  let healthManager: HealthManager;

  beforeAll(() => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }

    const sdk = createClient({ method: "apiKey", key: apiKey });
    healthManager = sdk.health;
  });

  it("gets overall health", async () => {
    const response = await healthManager.getOverallHealth();

    expect(response.timestamp).toBeDefined();
    expect(response.services).toBeInstanceOf(Array);
    expect(typeof response.timestamp).toBe("string");
  });
});
