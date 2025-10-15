import { BUILT_DEFAULT_BASE_ENV } from "./default-env";

declare const __BROWSER__: boolean;

export interface Environment {
  api: string;
  websocket: string;
  host: string;
  userPoolId: string;
  userPoolClientId: string;
  region?: string;
}
export type EnvName = "production";

export const ENVIRONMENTS: Record<EnvName, Environment> = {
  production: {
    api: "https://api.signaloid.io",
    websocket:
      "wss://spasofsn5fhb7fhkqq33ru5tvq.appsync-realtime-api.eu-west-2.amazonaws.com/event/realtime",
    host: "spasofsn5fhb7fhkqq33ru5tvq.appsync-api.eu-west-2.amazonaws.com",
    userPoolId: "eu-west-2_S05v0KKxN",
    userPoolClientId: "7bt8s3tk9l5itc78efm94f3hqr",
    region: "eu-west-2",
  },
};

let current: Environment | null = null;

const RUNTIME_IS_BROWSER =
  typeof window !== "undefined" &&
  typeof (window as any).document !== "undefined";
const IS_BROWSER =
  typeof __BROWSER__ !== "undefined" ? __BROWSER__ : RUNTIME_IS_BROWSER;

// Safe access to import.meta.env that won't break Jest/CJS
function safeImportMetaEnv(key: string): string | undefined {
  try {
    // eslint-disable-next-line no-eval
    const im = (0, eval)("import.meta");
    return im?.env?.[key];
  } catch {
    return undefined;
  }
}

function readRuntimeEnvVar(key: string): string | undefined {
  if (!IS_BROWSER) {
    // Node/Jest
    // @ts-ignore
    return typeof process !== "undefined" ? process.env?.[key] : undefined;
  }
  const g: any = globalThis as any;
  const fromGlobal = g?.SIGNALOID_ENV_VARS?.[key];
  const fromImportMeta = safeImportMetaEnv(key);
  const fromWindow = g?.[key];
  return fromGlobal ?? fromImportMeta ?? fromWindow;
}

// Only include defined values so we don't overwrite with undefined
function collectEnvOverrides(): Partial<Environment> {
  const o: Partial<Environment> = {};
  const put = (k: keyof Environment, v?: string) => {
    if (v !== undefined && v !== "") o[k] = v as any;
  };
  put("api", readRuntimeEnvVar("API_ENDPOINT"));
  put("websocket", readRuntimeEnvVar("WEBSOCKET_ENDPOINT"));
  put("host", readRuntimeEnvVar("HOST_ENDPOINT"));
  put("userPoolId", readRuntimeEnvVar("USER_POOL_ID"));
  put("userPoolClientId", readRuntimeEnvVar("USER_POOL_WEB_CLIENT_ID"));
  put("region", readRuntimeEnvVar("REGION"));
  return o;
}

function buildEnv(
  base: EnvName,
  overrides?: Partial<Environment>,
): Environment {
  const baseCfg = ENVIRONMENTS[base];
  const envOverrides = collectEnvOverrides();
  const merged = { ...baseCfg, ...envOverrides, ...overrides };
  try {
    // Will throw if invalid
    new URL(merged.api);
  } catch {
    // leave as-is for production, but this helps during tests
    // console.warn("Invalid API endpoint:", merged.api);
  }

  return merged;
}

export function setEnvironment(
  nameOrConfig: EnvName | Partial<Environment>,
  overrides?: Partial<Environment>,
): void {
  if (typeof nameOrConfig === "string") {
    current = buildEnv(nameOrConfig, overrides);
  } else {
    current = buildEnv("production", nameOrConfig);
  }
}

export function getEnvironment(): Environment {
  if (!current) current = buildEnv("production");
  return current;
}
