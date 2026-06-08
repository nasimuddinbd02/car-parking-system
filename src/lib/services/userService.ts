import {
  findUserByEmail,
  findUserByEmailAndTenant,
  findUserById,
} from "@/lib/data-access/user";

export async function getUserByEmail(email: string) {
  return findUserByEmail(email);
}

export async function getUserByEmailAndTenant(email: string, tenantId: string) {
  return findUserByEmailAndTenant(email, tenantId);
}

export async function getUserById(id: string) {
  return findUserById(id);
}
