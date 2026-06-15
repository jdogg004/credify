import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  const user1 = await prisma.user.upsert({
    where: { clerkId: "seed_user_1" },
    update: {},
    create: { clerkId: "seed_user_1", email: "alice@example.com", firstName: "Alice", lastName: "Johnson" },
  });

  const workspace1 = await prisma.workspace.upsert({
    where: { slug: "island-records-seed" },
    update: {},
    create: {
      name: "Island Records",
      slug: "island-records-seed",
      plan: "PRO",
      credits: 250,
      referralCode: "ISLAND01",
      members: { create: { userId: user1.id, role: "OWNER" } },
    },
  });

  await prisma.metadataJob.createMany({
    data: [
      {
        workspaceId: workspace1.id,
        userId: user1.id,
        rawInput: "Prod: Metro Boomin, Vocals: Drake, Mix: Mike",
        cleanedText: "Producer: Metro Boomin\nVocals: Drake\nMix Engineer: Mike Dean",
        issuesJson: JSON.stringify(["Abbreviated role 'Prod' expanded"]),
        suggestionsJson: JSON.stringify(["Verify mix engineer last name"]),
        confidenceNote: "High confidence",
        status: "COMPLETED",
        completedAt: new Date(),
      },
    ],
  });

  console.log("Seeded successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
