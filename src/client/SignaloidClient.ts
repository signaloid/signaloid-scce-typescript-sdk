import { AuthManager } from "../auth/AuthManager";
import { RealtimeClient } from "../realtime/RealtimeClient";
import { AuthOptions, ClientOptions } from "../types";
import { DEFAULT_ENDPOINTS } from "../constants/endpoints";
import { BuildsManager } from "../builds/BuildsManager";
import axios from "axios";
import { RepositoriesManager } from "../repositories/RepositoryManager";
import { SdkError } from "../errors/SdkError";
import { TasksManager } from "../tasks/TasksManger";
import { ERROR_CODES } from "../errors/codes";
import { CoresManager } from "../cores/CoresManager";
import { BucketsManager } from "../buckets/BucketsManager";
import { SamplesManager } from "../samples/SamplesManager";
import { FilesManager } from "../files/FilesManager";
import { PlottingManager } from "../plotting/PlottingManager";
import { DrivesManager } from "../drives/DrivesManager";
import { ThingsManager } from "../things/ThingsManager";
import { KeysManager } from "../keys/KeysManager";
import { UsersManager } from "../users/UsersManager";
import { SubscriptionsManager } from "../subscriptions/SubscriptionsManager";
import { GitHubManager } from "../github/GitHubManager";
import { HealthManager } from "../health/HealthManager";
import { WebhooksManager } from "../webhooks/WebhooksManager";
import { DatasourcesManager } from "../datasources/DatasourcesManager";

export class SignaloidClient {
  public auth: AuthManager;
  public realtime: RealtimeClient;
  public builds: BuildsManager;
  public repositories: RepositoriesManager;
  public tasks: TasksManager;
  public cores: CoresManager;
  public buckets: BucketsManager;
  public samples: SamplesManager;
  public files: FilesManager;
  public plotting: PlottingManager;
  public drives: DrivesManager;
  public things: ThingsManager;
  public keys: KeysManager;
  public users: UsersManager;
  public subscriptions: SubscriptionsManager;
  public github: GitHubManager;
  public health: HealthManager;
  public webhooks: WebhooksManager;
  public datasources: DatasourcesManager;

  constructor(
    authOptions: AuthOptions,
    clientOptions?: Partial<ClientOptions>,
  ) {
    const endpoints = {
      ...DEFAULT_ENDPOINTS,
      ...(clientOptions?.overrideEndpoints || {}),
    };

    this.auth = new AuthManager(authOptions);

    const signaloidApiClient = axios.create({
      baseURL: endpoints.api,
      timeout: 10000 /* 10 seconds */,
    });

    // Authentication configuration
    const AUTH_CONFIG = {
      // Default auth required (Cognito/JWT only) - these correspond to defaultMethodOptions in CDK
      DEFAULT_AUTH_PATHS: ["/subscriptions"],
    };

    // Auth compatibility interceptor
    signaloidApiClient.interceptors.request.use(async (config) => {
      const url = config.url || "";

      // Check if URL requires default auth
      const requiresDefaultAuth = AUTH_CONFIG.DEFAULT_AUTH_PATHS.some((path) =>
        url.startsWith(path),
      );

      if (requiresDefaultAuth && !this.auth.isCompatibleWithDefaultAuth()) {
        const method = config.method?.toUpperCase() || "GET";
        throw new SdkError(
          ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
          `${method} ${url} requires email/password or JWT authentication. API key authentication is not supported for this endpoint.`,
        );
      }

      // Add authorization header
      config.headers = config.headers || {};
      config.headers["Authorization"] =
        await this.auth.getAuthorizationHeader();
      return config;
    });

    // sanitize all errors
    signaloidApiClient.interceptors.response.use(
      (r) => r,
      async (err) => {
        const original = err.config as any;

        const status = err?.response?.status;
        const is401 = status === 401;
        const canRefresh = this.auth.getAuthMethod() === "email";

        if (is401 && canRefresh && !original?._retry) {
          original._retry = true;
          try {
            await this.auth.refreshTokens();

            // Reinject fresh Authorization header
            original.headers = original.headers || {};
            original.headers["Authorization"] =
              await this.auth.getAuthorizationHeader();

            return signaloidApiClient(original);
          } catch (refreshErr) {
            // fall through to sanitizer below
          }
        }
        if (err.response) {
          const { status, data } = err.response;
          const body = (typeof data === "object" && data) || {};
          const message = (body as any).message || err.message;

          let code: string;
          switch (status) {
            case 400:
              code = ERROR_CODES.API_BAD_REQUEST;
              break;
            case 401:
              code = ERROR_CODES.API_UNAUTHORIZED;
              break;
            case 403:
              code = ERROR_CODES.API_FORBIDDEN;
              break;
            case 404:
              code = ERROR_CODES.API_NOT_FOUND;
              break;
            case 409:
              code = ERROR_CODES.API_CONFLICT;
              break;
            case 422:
              code = ERROR_CODES.API_UNPROCESSABLE_ENTITY;
              break;
            case 500:
              code = ERROR_CODES.API_SERVER_ERROR;
              break;
            default:
              code = ERROR_CODES.API_FATAL;
              break;
          }

          return Promise.reject(new SdkError(code, message, body));
        }

        // no response (network / timeout / other)
        return Promise.reject(err);
      },
    );

    // Initialize managers
    this.users = new UsersManager(signaloidApiClient);
    this.realtime = new RealtimeClient(
      this.auth,
      endpoints.websocket,
      endpoints.host,
    );
    this.builds = new BuildsManager(
      signaloidApiClient,
      this.realtime,
      this.auth,
      this.users,
    );
    this.repositories = new RepositoriesManager(signaloidApiClient);
    this.cores = new CoresManager(signaloidApiClient);
    this.buckets = new BucketsManager(signaloidApiClient);
    this.samples = new SamplesManager(signaloidApiClient);
    this.files = new FilesManager(signaloidApiClient);
    this.plotting = new PlottingManager(signaloidApiClient);
    this.drives = new DrivesManager(signaloidApiClient);
    this.things = new ThingsManager(signaloidApiClient);
    this.keys = new KeysManager(signaloidApiClient);
    this.subscriptions = new SubscriptionsManager(signaloidApiClient);
    this.github = new GitHubManager(signaloidApiClient);
    this.health = new HealthManager(signaloidApiClient);
    this.webhooks = new WebhooksManager(signaloidApiClient);
    this.datasources = new DatasourcesManager(this.auth, this.users);
    this.tasks = new TasksManager(
      signaloidApiClient,
      this.realtime,
      this.auth,
      this.datasources,
      this.users,
    );
  }
}
