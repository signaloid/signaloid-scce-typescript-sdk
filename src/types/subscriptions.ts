/** The tiers `PUT /subscriptions` accepts. */
export type SubscribableTier = "FreeTier" | "ProTier" | "EnterpriseTierS" | "EnterpriseTierM" | "EnterpriseTierL";

/**
 * The tier `/subscriptions` reports. An account on a tier with no subscription behind it,
 * such as `DeveloperTier` or `AcademicTier`, reads back as `NO_TIER`; see `Tier` on
 * `UserDetails` for the account's actual tier.
 */
export type SubscriptionPlan = SubscribableTier | "NO_TIER";

export type FreeTrialDetails = {
	TrialStart: number | null;
	TrialEnd: number | null;
};

export type SubscriptionDetails = {
	Tier: SubscriptionPlan;
	StartDate: number | null;
	FreeTrial: FreeTrialDetails;
};

export type SubscriptionUpdateRequest = {
	Tier: SubscribableTier;
};
