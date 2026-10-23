/**
 * Tiers advertise no truly unlimited count. A limit described as unlimited is reported as this
 * safety cap instead, so render a value at or above it as "Unlimited".
 */
export const UNLIMITED_LIMIT_THRESHOLD = 1_000_000_000_000_000;
