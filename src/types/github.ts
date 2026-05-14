export type GitHubIntegration = {
  GithubUsername: string;
};

export type GitHubIntegrationRequest = {
  GithubAuthCode: string;
};

export type GitHubIntegrationCreateResponse = {
  message: string;
};
