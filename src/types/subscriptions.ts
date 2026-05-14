export type SubscriptionPlan =
  | "FreeTier"
  | "DeveloperTier"
  | "ProTier"
  | "EnterpriseTierS"
  | "EnterpriseTierM"
  | "EnterpriseTierL"
  | "NO_TIER";

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
  Tier: SubscriptionPlan;
};
