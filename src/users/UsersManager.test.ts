import { createClient } from "../client/createClient";
import { UsersManager } from "./UsersManager";

describe("UsersManager", () => {
  let usersManager: UsersManager;
  let userId: string;

  beforeAll(() => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    const userIdEnv = process.env.SIGNALOID_USER_ID;

    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }
    if (!userIdEnv) {
      throw new Error("Missing SIGNALOID_USER_ID environment variable");
    }

    const sdk = createClient({ method: "apiKey", key: apiKey });
    usersManager = sdk.users;
    userId = userIdEnv;
  });

  it("gets user details", async () => {
    const user = await usersManager.getOne(userId);

    expect(user.Object).toBe("User");
    expect(user.UserID).toBe(userId);
    expect(user.Username).toBeDefined();
    expect(user.CreatedAt).toBeDefined();
    expect(user.Preferences).toBeDefined();
    expect(user.ResourceUsage).toBeDefined();
    expect(typeof user.Username).toBe("string");
    expect(typeof user.CreatedAt).toBe("number");
  });

  it("gets user customization", async () => {
    try {
      const customization = await usersManager.getCustomization(userId);

      expect(customization.Object).toBe("UserCustomization");
      expect(customization.UserID).toBe(userId);
      expect(customization.AtomicNetworks).toBeDefined();
      expect(customization.Organizations).toBeDefined();
    } catch (error: any) {
      // Customization might not exist
      expect(error.message).toMatch(/Customization not found|Not Found/i);
    }
  });

  it("gets user logs", async () => {
    const logs = await usersManager.getLogs(userId);

    expect(logs.logs).toBeInstanceOf(Array);
    expect(typeof logs.totalResults).toBe("number");
    expect(logs.queryTimeRange).toBeDefined();
    expect(typeof logs.queryTimeRange.startTime).toBe("number");
    expect(typeof logs.queryTimeRange.endTime).toBe("number");
  });

  it("gets user logs with parameters", async () => {
    const options = {
      limit: 5,
      startTime: Date.now() - 86400000, // 24 hours ago
      endTime: Date.now(),
    };

    const logs = await usersManager.getLogs(userId, options);

    expect(logs.logs).toBeInstanceOf(Array);
    expect(logs.logs.length).toBeLessThanOrEqual(5);
  });

  it("logs out all sessions", async () => {
    const result = await usersManager.logoutAllSessions(userId);

    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe("string");
  });

  it("handles invalid user ID", async () => {
    await expect(usersManager.getOne("invalid-user-id")).rejects.toThrow();
  });
});
