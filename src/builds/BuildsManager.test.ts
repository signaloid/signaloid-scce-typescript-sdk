import { createClient } from "../client/createClient";
import { BuildsManager } from "./BuildsManager";
import { CreateSourceBuildRequest } from "../types/builds";
import { SignaloidClient } from "../client/SignaloidClient";

describe("BuildsManager", () => {
  let buildsManager: BuildsManager;
  let sdk: SignaloidClient;
  const createdRepos: string[] = []; // Track repos for cleanup

  beforeAll(() => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }

    sdk = createClient({ method: "apiKey", key: apiKey });
    buildsManager = sdk.builds;
  });

  afterAll(async () => {
    // Clean up any repositories created during tests
    for (const repoId of createdRepos) {
      try {
        await sdk.repositories.delete(repoId);
      } catch (error) {
        console.warn(`Failed to cleanup repository ${repoId}:`, error);
      }
    }
    createdRepos.length = 0; // Clear the array
  });

  afterAll(async () => {
    // Close realtime connections
    try {
      if (sdk?.realtime) {
        await sdk.realtime.close({ force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it("creates a build from source code", async () => {
    const payload: CreateSourceBuildRequest = {
      Code: `#include <stdio.h>
int main() {
    printf("Hello World!\\n");
    return 0;
}`,
      Language: "C",
      CoreID: "cor_b21e4de9927158c1a5b603c2affb8a09",
      Arguments: "",
      DataSources: [],
    };

    const build = await buildsManager.createFromSourceCode(payload);

    expect(build.BuildID).toBeDefined();
    expect(typeof build.BuildID).toBe("string");
  });

  it("creates a build from repository", async () => {
    let repositoryId: string;

    // Check if repositories exist
    const repos = await sdk.repositories.list();
    if (!repos.Repositories || repos.Repositories.length === 0) {
      // Create a repository if none exist
      const repoPayload = {
        RemoteURL: "https://github.com/signaloid/Signaloid-Demo-Basic-Addition",
        Commit: "HEAD",
        Branch: "main",
        BuildDirectory: "src",
        Arguments: "",
      };

      const createdRepo = await sdk.repositories.connect(repoPayload);
      repositoryId = createdRepo.RepositoryID;
      createdRepos.push(repositoryId); // Track for cleanup
    } else {
      repositoryId = repos.Repositories[0].RepositoryID;
    }

    const payload = {
      CoreID: "cor_b21e4de9927158c1a5b603c2affb8a09",
      Arguments: "",
    };

    const build = await buildsManager.createFromRepository(
      repositoryId,
      payload,
    );

    expect(build.BuildID).toBeDefined();
    expect(typeof build.BuildID).toBe("string");
  });

  it("lists builds", async () => {
    const response = await buildsManager.list();

    expect(response.Builds).toBeInstanceOf(Array);
    expect(typeof response.Count).toBe("number");
    expect(response.UserID).toBeDefined();
  });

  it("gets build details", async () => {
    const builds = await buildsManager.list();
    if (builds.Builds.length === 0) {
      console.warn("No builds available for testing");
      return;
    }

    const buildId = builds.Builds[0].BuildID;
    const build = await buildsManager.getOne(buildId);

    expect(build.BuildID).toBe(buildId);
    expect(build.Status).toBeDefined();
    expect(build.Owner).toBeDefined();
    expect(build.Application).toBeDefined();
  });

  it("handles non-existent build", async () => {
    await expect(buildsManager.getOne("invalid-build-id")).rejects.toThrow();
  });
});
