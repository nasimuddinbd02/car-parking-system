import {
  findPricingRules,
  updatePricingRule as dbUpdatePricingRule,
} from "@/lib/data-access/pricing";

export async function getPricingRules(tenantId: string) {
  return findPricingRules(tenantId);
}

export async function updatePricingRule(
  ruleId: string,
  baseRate: number,
  hourlyRate: number,
  peakMultiplier: number
) {
  return dbUpdatePricingRule(ruleId, baseRate, hourlyRate, peakMultiplier);
}
