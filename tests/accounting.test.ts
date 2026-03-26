import { describe, expect, it } from "vitest";
import { allocateSubscriptionContribution } from "@/lib/accounting";

describe("subscription allocation", () => {
  it("enforces minimum charity and allocates remaining to prize pool", () => {
    const result = allocateSubscriptionContribution({
      subscriptionAmount: 100,
      charityPercent: 10
    });

    expect(result.charityAmount).toBe(10);
    expect(result.prizePoolAmount).toBe(54);
    expect(result.retainedAmount).toBe(36);
  });
});
