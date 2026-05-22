import {
  findUserByEmail,
  findUserByCredentialsAndTenant,
  findUserById,
} from "@/lib/data-access/user";

export async function getUserByEmail(email: string) {
  return findUserByEmail(email);
}

export async function getUserByCredentialsAndTenant(
  email: string,
  passwordHash: string,
  tenantId: string
) {
  return findUserByCredentialsAndTenant(email, passwordHash, tenantId);
}

export async function getUserById(id: string) {
  return findUserById(id);
}
