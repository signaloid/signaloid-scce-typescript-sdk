export type GitHubIntegration = {
  Object: "GitHubIntegration";
  UserID: string;
  GithubUsername: string;
  ConnectedAt: number;
  UpdatedAt: number;
};

export type GitHubIntegrationRequest = {
  GithubUsername: string;
  GithubToken: string;
};
