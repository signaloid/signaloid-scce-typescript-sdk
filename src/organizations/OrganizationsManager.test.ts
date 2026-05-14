import { createClient } from "../client/createClient";
import { OrganizationsManager } from "./OrganizationsManager";

describe("OrganizationsManager", () => {
  let orgsManager: OrganizationsManager;

  beforeAll(() => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }

    const sdk = createClient({ method: "apiKey", key: apiKey });
    orgsManager = sdk.organizations;
  });

  it("lists invitations", async () => {
    const response = await orgsManager.listInvitations();

    expect(response.Invitations).toBeInstanceOf(Array);
    expect(typeof response.Count).toBe("number");
  });

  it("handles get with invalid org ID", async () => {
    await expect(orgsManager.get("invalid-org-id")).rejects.toThrow();
  });

  it("handles create: succeeds on Enterprise tier, rejects otherwise", async () => {
    const name = `sdk-test-org-${Date.now()}`;
    try {
      const org = await orgsManager.create({ Name: name });
      // Enterprise tier path: verify response shape
      expect(org.OrganizationID).toBeDefined();
      expect(org.Name).toBe(name);
      expect(org.Role).toBe("Owner");
    } catch (error: any) {
      // Non-Enterprise tier path: expect forbidden/bad-request
      expect(error?.code).toBeDefined();
      expect([
        "API_FORBIDDEN",
        "API_BAD_REQUEST",
        "API_UNPROCESSABLE_ENTITY",
      ]).toContain(error.code);
    }
  });
});
