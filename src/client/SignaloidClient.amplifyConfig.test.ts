jest.mock("axios", () => {
	const instance = {
		interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
	};

	return {
		__esModule: true,
		default: { create: jest.fn(() => instance), put: jest.fn() },
	};
});

const OAUTH = {
	domain: "auth.example.com",
	redirectSignIn: ["https://app.example.com/"],
	redirectSignOut: ["https://app.example.com/"],
};

const EXPLICIT_POOL = { userPoolId: "eu-west-2_EXPLICIT", userPoolClientId: "explicitclient" };

const HOST_CONFIG = {
	Auth: {
		Cognito: {
			userPoolId: "eu-west-2_HOSTPOOL",
			userPoolClientId: "hostclient123",
		},
	},
};

/** Imports the SDK, Amplify and axios from one fresh module registry, so they share one Amplify. */
async function freshSdk() {
	jest.resetModules();

	const { Amplify } = await import("aws-amplify");
	const { SignaloidClient } = await import("./SignaloidClient");
	const axios = (await import("axios")).default;

	return { Amplify, SignaloidClient, axios };
}

const ENVIRONMENT_VARIABLES = [
	"SIGNALOID_ENV",
	"SIGNALOID_BASE_ENV",
	"RUNTIME_ENV",
	"API_ENDPOINT",
	"WEBSOCKET_ENDPOINT",
	"HOST_ENDPOINT",
	"PUBLIC_WEBSOCKET_ENDPOINT",
	"PUBLIC_HOST_ENDPOINT",
	"USER_POOL_ID",
	"USER_POOL_WEB_CLIENT_ID",
	"REGION",
];

describe("SignaloidClient Amplify configuration", () => {
	const OLD_ENV = process.env;

	let warn: jest.SpyInstance;

	beforeEach(() => {
		warn = jest.spyOn(console, "warn").mockImplementation(() => {});
		process.env = { ...OLD_ENV };
		for (const name of ENVIRONMENT_VARIABLES) {
			delete process.env[name];
		}
	});

	afterEach(() => {
		warn.mockRestore();
	});

	afterAll(() => {
		process.env = OLD_ENV;
	});

	test("does not overwrite Amplify config the host app already set", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		Amplify.configure(HOST_CONFIG);

		new SignaloidClient({ method: "email" });

		expect(Amplify.getConfig().Auth?.Cognito?.userPoolId).toBe("eu-west-2_HOSTPOOL");
		expect(Amplify.getConfig().Auth?.Cognito?.userPoolClientId).toBe("hostclient123");
	});

	test("leaves Amplify untouched when manageAmplifyConfig is false", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();

		new SignaloidClient({ method: "email" }, { manageAmplifyConfig: false });

		expect(Amplify.getConfig().Auth).toBeUndefined();
	});

	test("configures Amplify when no host config exists", async () => {
		process.env.SIGNALOID_ENV = "production";
		const { Amplify, SignaloidClient } = await freshSdk();

		new SignaloidClient({ method: "email" });

		expect(Amplify.getConfig().Auth?.Cognito?.userPoolId).toBe("eu-west-2_S05v0KKxN");
	});

	test("uses the environment set after import, when the client is created", async () => {
		const { Amplify, SignaloidClient, axios } = await freshSdk();
		process.env.SIGNALOID_ENV = "production";

		new SignaloidClient({ method: "email" });

		expect(axios.create).toHaveBeenCalledWith(
			expect.objectContaining({ baseURL: "https://api.signaloid.io" }),
		);
		expect(Amplify.getConfig().Auth?.Cognito?.userPoolId).toBe("eu-west-2_S05v0KKxN");
	});

	test("accepts an explicit Cognito pool from ClientOptions", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();

		new SignaloidClient({ method: "email" }, { cognito: EXPLICIT_POOL });

		expect(Amplify.getConfig().Auth?.Cognito).toMatchObject(EXPLICIT_POOL);
	});

	test("configures Google sign-in on an explicit Cognito pool", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();

		new SignaloidClient({ method: "email", oauth: OAUTH }, { cognito: EXPLICIT_POOL });

		expect(Amplify.getConfig().Auth?.Cognito).toMatchObject({
			...EXPLICIT_POOL,
			loginWith: { oauth: { domain: OAUTH.domain } },
		});
	});

	test("adds Google sign-in from a later client to the SDK's own Amplify config", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		new SignaloidClient({ method: "email" }, { cognito: EXPLICIT_POOL });

		new SignaloidClient({ method: "email", oauth: OAUTH }, { cognito: EXPLICIT_POOL });

		expect(Amplify.getConfig().Auth?.Cognito).toMatchObject({
			...EXPLICIT_POOL,
			loginWith: { oauth: { domain: OAUTH.domain } },
		});
		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("Signaloid SDK"));
	});

	test("keeps Google sign-in when a later client does not ask for it", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		new SignaloidClient({ method: "email", oauth: OAUTH });

		new SignaloidClient({ method: "email" });

		expect(Amplify.getConfig().Auth?.Cognito?.loginWith?.oauth?.domain).toBe(OAUTH.domain);
	});

	test("warns and keeps the pool when a later client asks for another one", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		new SignaloidClient({ method: "email" }, { cognito: EXPLICIT_POOL });

		new SignaloidClient(
			{ method: "email", oauth: OAUTH },
			{ cognito: { userPoolId: "eu-west-2_OTHER", userPoolClientId: "otherclient" } },
		);

		expect(Amplify.getConfig().Auth?.Cognito).toMatchObject(EXPLICIT_POOL);
		expect(Amplify.getConfig().Auth?.Cognito?.loginWith).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("`oauth` and `cognito`"));
	});

	test("warns when Google sign-in is asked for on an Amplify the host app configured", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		Amplify.configure(HOST_CONFIG);

		new SignaloidClient({ method: "email", oauth: OAUTH });

		expect(Amplify.getConfig().Auth?.Cognito?.loginWith).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining("the app set up Amplify without Google sign-in"),
		);
	});

	test("warns when Cognito options are given with manageAmplifyConfig false", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();

		new SignaloidClient({ method: "email" }, { cognito: EXPLICIT_POOL, manageAmplifyConfig: false });

		expect(Amplify.getConfig().Auth).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("`manageAmplifyConfig` is false"));
	});

	test("does not warn when no Cognito options are given to an Amplify the host app configured", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		Amplify.configure(HOST_CONFIG);

		new SignaloidClient({ method: "email" });

		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("Signaloid SDK"));
	});
	test("keeps the Amplify categories the app configured before the first client", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		Amplify.configure({ Storage: { S3: { bucket: "host-bucket", region: "eu-west-2" } } });

		new SignaloidClient({ method: "email" }, { cognito: EXPLICIT_POOL });

		expect(Amplify.getConfig().Storage?.S3?.bucket).toBe("host-bucket");
		expect(Amplify.getConfig().Auth?.Cognito).toMatchObject(EXPLICIT_POOL);
	});

	test("keeps the identity pool the app configured without a user pool", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		Amplify.configure({
			Auth: { Cognito: { identityPoolId: "eu-west-2:host-identity", allowGuestAccess: true } },
		});

		new SignaloidClient({ method: "email" }, { cognito: EXPLICIT_POOL });

		expect(Amplify.getConfig().Auth?.Cognito).toMatchObject({
			...EXPLICIT_POOL,
			identityPoolId: "eu-west-2:host-identity",
			allowGuestAccess: true,
		});
	});

	test("keeps the app's Auth settings when a later client adds Google sign-in", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		new SignaloidClient({ method: "email" }, { cognito: EXPLICIT_POOL });
		Amplify.configure({
			Auth: { Cognito: { ...EXPLICIT_POOL, identityPoolId: "eu-west-2:host-identity" } },
		});

		new SignaloidClient({ method: "email", oauth: OAUTH }, { cognito: EXPLICIT_POOL });

		expect(Amplify.getConfig().Auth?.Cognito).toMatchObject({
			identityPoolId: "eu-west-2:host-identity",
			loginWith: { oauth: { domain: OAUTH.domain } },
		});
	});

	test("warns and keeps Google sign-in when a later client asks for other redirect URLs", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		new SignaloidClient({ method: "email", oauth: OAUTH });

		new SignaloidClient({
			method: "email",
			oauth: { ...OAUTH, redirectSignIn: ["https://other.example.com/"] },
		});

		expect(Amplify.getConfig().Auth?.Cognito?.loginWith?.oauth?.redirectSignIn).toEqual(
			OAUTH.redirectSignIn,
		);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("another domain or redirect URLs"));
	});

	test("does not warn when a later client asks for the same Google sign-in", async () => {
		const { SignaloidClient } = await freshSdk();
		new SignaloidClient({ method: "email", oauth: OAUTH });

		new SignaloidClient({ method: "email", oauth: { ...OAUTH } });

		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("Signaloid SDK"));
	});

	test("does not warn when `cognito` names the pool the app configured", async () => {
		const { Amplify, SignaloidClient } = await freshSdk();
		Amplify.configure({ Auth: { Cognito: EXPLICIT_POOL } });

		new SignaloidClient({ method: "email" }, { cognito: EXPLICIT_POOL });

		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("Signaloid SDK"));
	});
});
