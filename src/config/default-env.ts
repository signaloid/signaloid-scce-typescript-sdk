export type BuiltEnvName = "production";

/**
 * This value is baked at build time by CI. Do not edit manually.
 * The committed default is "production"; CI overwrites it per-release.
 */
export const BUILT_DEFAULT_BASE_ENV: BuiltEnvName = "production";
