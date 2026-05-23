import { PrismaClient } from "@prisma/client";
import { encryptSession } from "../src/lib/session";

const prisma = new PrismaClient();

async function testPage(url: string, cookieStr?: string): Promise<{ status: number; text: string }> {
  const headers: Record<string, string> = {};
  if (cookieStr) {
    headers["Cookie"] = cookieStr;
  }
  const res = await fetch(url, { headers });
  const text = await res.text();
  return { status: res.status, text };
}

async function runTests() {
  console.log("=== STARTING PAGE INTEGRATION TESTS ===");
  
  // 1. Fetch Tenant and Users from database
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "metro-park" }
  });
  if (!tenant) {
    console.error("Error: Seed tenant metro-park not found. Please run seed script first.");
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: { email: "admin@metro.com", tenantId: tenant.id }
  });
  const attendant = await prisma.user.findFirst({
    where: { email: "att1@metro.com", tenantId: tenant.id }
  });
  const customer = await prisma.user.findFirst({
    where: { email: "driver@metro.com", tenantId: tenant.id }
  });

  if (!admin || !attendant || !customer) {
    console.error("Error: Pre-seeded users not found.");
    process.exit(1);
  }

  // 2. Helper to construct session cookies
  const getCookie = (user: any) => {
    const sessionObj = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug
    };
    return `session=${encodeURIComponent(encryptSession(sessionObj))}`;
  };

  const adminCookie = getCookie(admin);
  const attendantCookie = getCookie(attendant);
  const customerCookie = getCookie(customer);

  const base = "http://localhost:3000";

  interface TestSpec {
    name: string;
    path: string;
    cookie?: string;
    expectedContent: string;
  }

  const tests: TestSpec[] = [
    {
      name: "SaaS Landing Page",
      path: "/",
      expectedContent: "PARKEASY SaaS"
    },
    {
      name: "Tenant Login Page",
      path: "/tenant/metro-park/login",
      expectedContent: "Workspace Login"
    },
    {
      name: "Tenant Landing Page",
      path: "/tenant/metro-park",
      expectedContent: "Welcome to Metropolis Plaza Parking"
    },
    {
      name: "Admin Dashboard (Authenticated)",
      path: "/tenant/metro-park/admin",
      cookie: adminCookie,
      expectedContent: "Today's Earnings"
    },
    {
      name: "Reports Dashboard (Authenticated)",
      path: "/tenant/metro-park/admin/reports",
      cookie: adminCookie,
      expectedContent: "Financial Accounting Center"
    },
    {
      name: "Attendant Console (Authenticated)",
      path: "/tenant/metro-park/attendant",
      cookie: attendantCookie,
      expectedContent: "Gate Check-In"
    },
    {
      name: "Customer Portal (Authenticated)",
      path: "/tenant/metro-park/customer",
      cookie: customerCookie,
      expectedContent: "Interactive Parking Layout"
    }
  ];

  let passedCount = 0;
  for (const t of tests) {
    try {
      console.log(`Testing [${t.name}] at ${t.path}...`);
      const { status, text } = await testPage(`${base}${t.path}`, t.cookie);
      
      if (status !== 200) {
        console.error(`❌ Fail: [${t.name}] returned status code ${status}`);
        continue;
      }
      
      // Clean HTML tags and hydration comments to get plain text
      const plainText = text.replace(/<[^>]*>/g, "").replace(/<!--.*?-->/g, "");
      
      if (!plainText.includes(t.expectedContent)) {
        console.error(`❌ Fail: [${t.name}] HTML response did not contain expected content: "${t.expectedContent}"`);
        console.error("Snippet of cleaned text:", plainText.slice(0, 500));
        continue;
      }

      console.log(`✅ Pass: [${t.name}] renders successfully.`);
      passedCount++;
    } catch (err: any) {
      console.error(`❌ Error testing [${t.name}]:`, err.message);
    }
  }

  console.log(`\n=== RESULTS: ${passedCount}/${tests.length} tests passed ===`);
  await prisma.$disconnect();
  if (passedCount !== tests.length) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
