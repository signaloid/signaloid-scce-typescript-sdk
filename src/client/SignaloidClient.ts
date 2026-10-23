import { AuthManager } from "../auth/AuthManager";
import { RealtimeClient } from "../realtime/RealtimeClient";
import { AuthOptions, ClientOptions } from "../types";
import { DEFAULT_ENDPOINTS } from "../constants/endpoints";
import { BuildsManager } from "../builds/BuildsManager";
import axios from "axios";
import { RepositoriesManager } from "../repositories/RepositoryManager";
import { SdkError } from "../errors/SdkError";
import { TasksManager } from "../tasks/TasksManager";
import { ERROR_CODES, STATUS_ERROR_CODES } from "../errors/codes";
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
import { OrganizationsManager } from "../organizations/OrganizationsManager";
import { DatasourcesManager } from "../datasources/DatasourcesManager";
import { TiersManager } from "../tiers/TiersManager";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ASCTIME_DATE = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) ([A-Z][a-z]{2}) {1,2}(\d{1,2}) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/;

// The obsolete `asctime` form of an HTTP date, such as "Sun Nov  6 08:49:37 1994", carries no zone
// but is UTC (RFC 9110). Date.parse would read it as local time, so it is built explicitly.
function parseAsctimeDate(value: string): number {
	const match = ASCTIME_DATE.exec(value);
	const month = match ? MONTHS.indexOf(match[1]) : -1;
	if (!match || month < 0) {
		return NaN;
	}
	const [, , day, hours, minutes, seconds, year] = match.map(Number);
	return Date.UTC(year, month, day, hours, minutes, seconds);
}

// Retry-After is either a number of seconds or an HTTP date (RFC 9110).
function parseRetryAfter(header: unknown): number | undefined {
	const value = typeof header === "string" ? header.trim() : "";
	if (/^\d+$/.test(value)) {
		return Number(value);
	}
	// The IMF-fixdate and RFC 850 forms end in "GMT"; requiring it keeps Date.parse from accepting
	// malformed values such as "-5" or "1e3".
	const date = value.endsWith("GMT") ? Date.parse(value) : parseAsctimeDate(value);
	return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export class SignaloidClient {
	public auth: AuthManager;
	public realtime: RealtimeClient;
	public publicRealtime: RealtimeClient;
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
	public organizations: OrganizationsManager;
	public datasources: DatasourcesManager;
	public tiers: TiersManager;

	constructor(authOptions: AuthOptions, clientOptions?: Partial<ClientOptions>) {
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
			const requiresDefaultAuth = AUTH_CONFIG.DEFAULT_AUTH_PATHS.some((path) => url.startsWith(path));

			if (requiresDefaultAuth && !this.auth.isCompatibleWithDefaultAuth()) {
				const method = config.method?.toUpperCase() || "GET";
				throw new SdkError(
					ERROR_CODES.AUTH_UNSUPPORTED_METHOD,
					`${method} ${url} requires email/password or JWT authentication. API key authentication is not supported for this endpoint.`,
				);
			}

			// Add authorization header
			config.headers = config.headers || {};
			config.headers["Authorization"] = await this.auth.getAuthorizationHeader();
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

						// Inject the fresh Authorization header again
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
					const body: { message?: string; error?: unknown } = (typeof data === "object" && data) || {};
					const message = body.message || err.message;

					// For 5xx, the precise code is on err.status
					const code =
						typeof status === "number" && status >= 500 && status <= 599
							? ERROR_CODES.API_SERVER_ERROR
							: (STATUS_ERROR_CODES[status] ?? ERROR_CODES.API_FATAL);
					const errorType = typeof body.error === "string" ? body.error : undefined;
					const retryAfter = parseRetryAfter(err.response.headers?.["retry-after"]);

					return Promise.reject(new SdkError(code, message, body, status, { errorType, retryAfter }));
				}

				// no response (network / timeout / other)
				return Promise.reject(err);
			},
		);

		// Initialize managers
		this.users = new UsersManager(signaloidApiClient);
		this.realtime = new RealtimeClient(this.auth, endpoints.websocket, endpoints.host);
		this.publicRealtime = new RealtimeClient(this.auth, endpoints.publicWebsocket, endpoints.publicHost);
		this.builds = new BuildsManager(signaloidApiClient, this.realtime, this.publicRealtime, this.auth, this.users);
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
		this.organizations = new OrganizationsManager(signaloidApiClient);
		this.tiers = new TiersManager(signaloidApiClient);
		this.datasources = new DatasourcesManager(this.auth, this.users);
		this.tasks = new TasksManager(
			signaloidApiClient,
			this.realtime,
			this.publicRealtime,
			this.auth,
			this.datasources,
			this.users,
		);
	}
}
