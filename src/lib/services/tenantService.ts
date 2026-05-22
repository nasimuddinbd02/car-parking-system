import {
  findTenantBySlug,
  findTenantWithStructureAndRules,
  findTenantWithOrderedStructure,
  createTenantWithDefaults as dbCreateTenantWithDefaults,
} from "@/lib/data-access/tenant";

export async function getTenantBySlug(slug: string) {
  return findTenantBySlug(slug);
}

export async function getTenantWithStructureAndRules(slug: string) {
  return findTenantWithStructureAndRules(slug);
}

export async function getTenantWithOrderedStructure(tenantId: string) {
  return findTenantWithOrderedStructure(tenantId);
}

export async function createTenantWithDefaults(
  companyName: string,
  cleanSlug: string,
  adminName: string,
  adminEmail: string,
  hashedPassword: string
) {
  return dbCreateTenantWithDefaults(
    companyName,
    cleanSlug,
    adminName,
    adminEmail,
    hashedPassword
  );
}
