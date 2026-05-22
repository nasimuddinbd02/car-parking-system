import prisma from "@/lib/db";

export async function findPricingRules(tenantId: string) {
  return prisma.pricingRule.findMany({
    where: { tenantId },
  });
}

export async function updatePricingRule(
  ruleId: string,
  baseRate: number,
  hourlyRate: number,
  peakMultiplier: number
) {
  return prisma.pricingRule.update({
    where: { id: ruleId },
    data: {
      baseRate,
      hourlyRate,
      peakMultiplier,
    },
  });
}
