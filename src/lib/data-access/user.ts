import prisma from "@/lib/db";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserByEmailAndTenant(email: string, tenantId: string) {
  return prisma.user.findFirst({
    where: {
      email,
      tenantId,
    },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}
