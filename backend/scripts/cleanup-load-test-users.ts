import { PrismaClient } from "@prisma/client";
import { cleanupLoadTestUsers } from "../src/modules/admin/admin-cleanup.service.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Searching for load test users (username LIKE 'load_%')...");

  const result = await cleanupLoadTestUsers(prisma);

  if (result.deleted === 0) {
    console.log("✅ No load test users found. Nothing to clean.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${result.deleted} load test users: ${result.usernames.join(", ")}`);
  if (result.templatesDeleted > 0) {
    console.log(`  🗑️  Deleted ${result.templatesDeleted} templates`);
  }
  console.log(`  🗑️  Deleted ${result.deleted} users (cascaded to tier lists, tiers, placements, likes, etc.)`);
  if (result.orphanedBooks) {
    console.log(`  🗑️  Cleaned ${result.orphanedBooks} orphaned book records`);
  }
  console.log("✅ Load test cleanup complete!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
