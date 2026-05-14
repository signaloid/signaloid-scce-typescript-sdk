import { createClient } from "../client/createClient";
import { OrganizationsManager } from "./OrganizationsManager";

describe("OrganizationsManager", () => {
  let orgsManager: OrganizationsManager;
  let currentUserID: string | undefined;
  const createdOrgIDs: string[] = [];

  beforeAll(async () => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }

    const sdk = createClient({ method: "apiKey", key: apiKey });
    orgsManager = sdk.organizations;
    try {
      currentUserID = (await sdk.users.me()).UserID;
    } catch {
      /* currentUserID stays undefined; afterAll logs a warning */
    }
  });

  afterAll(async () => {
    // SDK has no delete-org endpoint; removing the current user is the closest cleanup, so log a warning when it fails to flag manual cleanup.
    for (const orgID of createdOrgIDs) {
      if (!currentUserID) {
        console.warn(
          `OrganizationsManager.test: created org ${orgID} but could not resolve current user for cleanup; remove manually.`,
        );
        continue;
      }
      try {
        await orgsManager.removeUser(orgID, currentUserID);
      } catch (e) {
        console.warn(
          `OrganizationsManager.test: failed to remove user from created org ${orgID}; remove manually.`,
          e,
        );
      }
    }
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
      createdOrgIDs.push(org.OrganizationID);
      expect(org.OrganizationID).toBeDefined();
      expect(org.Name).toBe(name);
      expect(org.Role).toBe("Owner");
    } catch (error: any) {
      expect(error?.code).toBeDefined();
      expect([
        "API_FORBIDDEN",
        "API_BAD_REQUEST",
        "API_UNPROCESSABLE_ENTITY",
        "API_CONFLICT",
      ]).toContain(error.code);
    }
  });
});
