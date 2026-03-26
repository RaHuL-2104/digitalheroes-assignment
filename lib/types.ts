export type UserRole = "visitor" | "subscriber" | "admin";

export type SubscriptionPlan = "monthly" | "yearly";

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "canceled"
  | "lapsed"
  | "pending";

export type DrawMode = "random" | "algorithmic_most_frequent" | "algorithmic_least_frequent";

export type DrawTier = "match_5" | "match_4" | "match_3";

export type WinnerVerificationStatus = "pending_verification" | "approved" | "rejected";

export type PayoutStatus = "pending" | "paid";

export type ScoreRecord = {
  id?: string;
  userId: string;
  score: number;
  playedAt: string;
  createdAt?: string;
};

export type DrawSimulationResult = {
  generatedNumbers: number[];
  winnersByTier: Record<DrawTier, number>;
  projectedPayoutByTier: Record<DrawTier, number>;
  projectedRollover: number;
};

export type PrizeDistributionResult = {
  byTier: Record<DrawTier, number>;
  rolloverToNextMonth: number;
};

export type DashboardSummary = {
  subscriptionStatus: SubscriptionStatus;
  renewalDate: string | null;
  drawsEntered: number;
  upcomingDrawDate: string | null;
  totalWon: number;
  payoutStatus: PayoutStatus | null;
};

export type AuthReadinessStatus = "ready" | "degraded";

export type UserSessionContext = {
  userId: string | null;
  role: UserRole;
  emailVerified: boolean;
  readiness: AuthReadinessStatus;
};

export type ActionResult = {
  ok: boolean;
  code?: string;
  message?: string;
};
