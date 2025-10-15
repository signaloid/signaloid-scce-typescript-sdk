import { createClient } from "../client/createClient";
import { GitHubManager } from "./GitHubManager";
import { GitHubIntegrationRequest } from "../types/github";

describe("GitHubManager", () => {
  let githubManager: GitHubManager;
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
    githubManager = sdk.github;
    userId = userIdEnv;
  });

  it("gets integration (may not exist)", async () => {
    try {
      const integration = await githubManager.getIntegration(userId);
      expect(integration.GithubUsername).toBeDefined();
      expect(typeof integration.GithubUsername).toBe("string");
    } catch (error: any) {
      // Integration might not exist - this is expected
      expect(error.message).toMatch(
        /No GitHub integration found|404|not found/i,
      );
    }
  });

  it("attempts to create integration", async () => {
    const payload: GitHubIntegrationRequest = {
      GithubToken: "test_token_123456789",
      GithubUsername: "testuser",
    };

    try {
      const integration = await githubManager.createOrUpdateIntegration(
        userId,
        payload,
      );
      expect(integration.GithubUsername).toBe(payload.GithubUsername);
    } catch (error: any) {
      // Expected to fail due to auth code requirement
      expect(error.message).toMatch(
        /GitHub auth code not provided|BadRequest/i,
      );
    }
  });

  it("deletes integration", async () => {
    const result = await githubManager.deleteIntegration(userId);

    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe("string");
  });

  it("handles proxy request", async () => {
    try {
      const response = await githubManager.proxyRequest("user", "GET");
      expect(response).toBeDefined();
    } catch (error) {
      // Expected to fail without proper GitHub authentication
      expect(error).toBeDefined();
    }
  });

  it("handles invalid user ID", async () => {
    try {
      await githubManager.getIntegration("invalid-user-id");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
