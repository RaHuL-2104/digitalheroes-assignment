export type AllocationInput = {
  subscriptionAmount: number;
  charityPercent: number;
};

export type AllocationResult = {
  charityAmount: number;
  prizePoolAmount: number;
  retainedAmount: number;
};

export function allocateSubscriptionContribution(input: AllocationInput): AllocationResult {
  if (input.subscriptionAmount <= 0) {
    throw new Error("Subscription amount must be positive.");
  }
  if (input.charityPercent < 10 || input.charityPercent > 100) {
    throw new Error("Charity contribution must be between 10% and 100%.");
  }

  const charityAmount = Number(((input.subscriptionAmount * input.charityPercent) / 100).toFixed(2));
  const remaining = Number((input.subscriptionAmount - charityAmount).toFixed(2));
  const prizePoolAmount = Number((remaining * 0.6).toFixed(2));
  const retainedAmount = Number((remaining - prizePoolAmount).toFixed(2));

  return {
    charityAmount,
    prizePoolAmount,
    retainedAmount
  };
}
