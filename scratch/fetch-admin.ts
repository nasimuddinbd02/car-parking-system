import { PrismaClient } from "@prisma/client";
import { encryptSession } from "../src/lib/session";

const prisma = new PrismaClient();

async function run() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "metro-park" } });
  if (!tenant) {
    console.error("Tenant not found");
    return;
  }
  const admin = await prisma.user.findFirst({ where: { email: "admin@metro.com", tenantId: tenant.id } });
  if (!admin) {
    console.error("Admin user not found");
    return;
  }
  const sessionObj = {
    userId: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    tenantId: tenant.id,
    tenantSlug: tenant.slug
  };
  const cookie = `session=${encodeURIComponent(encryptSession(sessionObj))}`;
  const res = await fetch("http://localhost:3000/tenant/metro-park/admin", {
    headers: { Cookie: cookie }
  });
  console.log("Status:", res.status);
  const body = await res.text();
  console.log("Body snippet:", body.slice(0, 1500));
  await prisma.$disconnect();
}

run().catch(console.error);
