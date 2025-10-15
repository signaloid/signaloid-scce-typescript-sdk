export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "past_due"
  | "canceled"
  | "unpaid";

export type SubscriptionPlan =
  | "FreeTier"
  | "DeveloperTier"
  | "AcademicTier"
  | "ProTier"
  | "EnterpriseTier";

export type FreeTrialDetails = {
  TrialStart: number;
  TrialEnd: number;
};

export type SubscriptionDetails = {
  Tier: SubscriptionPlan;
  StartDate: number;
  FreeTrial: FreeTrialDetails;
};

export type SubscriptionUpdateRequest = {
  Plan: SubscriptionPlan;
  PaymentMethodID?: string;
};
