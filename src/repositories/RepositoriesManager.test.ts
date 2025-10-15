import { createClient } from "../client/createClient";
import { RepositoriesManager } from "./RepositoryManager";
import { RepositoryRequest } from "../types/repositories";

describe("RepositoriesManager", () => {
  let reposManager: RepositoriesManager;
  const createdRepos: string[] = []; // Track repos for cleanup

  beforeAll(() => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }

    const sdk = createClient({ method: "apiKey", key: apiKey });
    reposManager = sdk.repositories;
  });

  afterAll(async () => {
    // Clean up any repositories created during tests
    for (const repoId of createdRepos) {
      try {
        await reposManager.delete(repoId);
      } catch (error) {
        console.warn(`Failed to cleanup repository ${repoId}:`, error);
      }
    }
    createdRepos.length = 0; // Clear the array
  });

  it("connects a repository", async () => {
    const payload: RepositoryRequest = {
      RemoteURL: "https://github.com/signaloid/Signaloid-Demo-Basic-Addition",
      Commit: "HEAD",
      Branch: "main",
      BuildDirectory: "src",
      Arguments: "",
    };

    const repo = await reposManager.connect(payload);
    createdRepos.push(repo.RepositoryID); // Track for cleanup

    expect(repo.RepositoryID).toBeDefined();
    expect(repo.RemoteURL).toBe(payload.RemoteURL);
    expect(repo.Branch).toBe(payload.Branch);
    expect(repo.BuildDirectory).toBe(payload.BuildDirectory);
  });

  it("lists repositories", async () => {
    const response = await reposManager.list();

    expect(response.Repositories).toBeInstanceOf(Array);
  });

  it("gets repository details", async () => {
    const repos = await reposManager.list();
    if (!repos.Repositories || repos.Repositories.length === 0) {
      console.warn("No repositories available for testing");
      return;
    }

    const repoId = repos.Repositories[0].RepositoryID;
    const repo = await reposManager.getOne(repoId);

    expect(repo.RepositoryID).toBe(repoId);
    expect(repo.RemoteURL).toBeDefined();
  });

  it("gets repository builds", async () => {
    const repos = await reposManager.list();
    if (!repos.Repositories || repos.Repositories.length === 0) {
      console.warn("No repositories available for testing");
      return;
    }

    const repoId = repos.Repositories[0].RepositoryID;
    const response = await reposManager.getBuilds(repoId);

    expect(response.Builds).toBeInstanceOf(Array);
  });
});
