import { prisma } from "../lib/prisma.js";
import { processAction } from "../modules/achievements/achievements.service.js";

async function main() {
  const userId = 1;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  console.log("Initial User:", { xp: user?.xp, title: user?.title });

  // Clean up any existing achievements for user 1 to test fresh grant
  await prisma.userAchievement.deleteMany({ where: { userId } });
  await prisma.user.update({ where: { id: userId }, data: { xp: 0, title: "Новичок" } });

  console.log("Running processAction('create_tier_list')...");
  const results = await processAction(userId, 'create_tier_list');
  console.log("Granted achievements:", results.map(r => r.id));

  const finalUser = await prisma.user.findUnique({ where: { id: userId } });
  console.log("Final User:", { xp: finalUser?.xp, title: finalUser?.title });

  await prisma.$disconnect();
}

main().catch(console.error);
