import prisma from "@/lib/db";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserByCredentialsAndTenant(
  email: string,
  passwordHash: string,
  tenantId: string
) {
  return prisma.user.findFirst({
    where: {
      email,
      passwordHash,
      tenantId,
    },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}
