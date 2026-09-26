import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import argon2 from "argon2";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

const demoUsers = [
  { email: "andi@demo.local", username: "andi", displayName: "Andi Pratama" },
  { email: "bunga@demo.local", username: "bunga", displayName: "Bunga Lestari" },
  { email: "citra@demo.local", username: "citra", displayName: "Citra Dewi" },
  { email: "dimas@demo.local", username: "dimas", displayName: "Dimas Nugroho" },
];

async function main(): Promise<void> {
  // These accounts share a published password, so never seed them somewhere real.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed demo ditolak saat NODE_ENV=production");
  }
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!/(localhost|127\.0\.0\.1)/.test(databaseUrl)) {
    throw new Error(`Seed demo ditolak: DATABASE_URL bukan host lokal (${databaseUrl.replace(/:[^:@/]*@/, ":***@")})`);
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD);
  const users = [];

  for (const demo of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: { displayName: demo.displayName, username: demo.username },
      create: {
        ...demo,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    users.push(user);
  }

  const room = await prisma.conversation.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      type: "PUBLIC",
      name: "Lobby Publik",
      description: "Room welcome untuk semua orang yang baru gabung.",
      ownerId: users[0]!.id,
    },
  });

  for (const user of users) {
    await prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: room.id, userId: user.id } },
      update: {},
      create: { conversationId: room.id, userId: user.id, role: "MEMBER" },
    });
  }

  const [, second] = users;
  if (second) {
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "PRIVATE",
        AND: [
          { members: { some: { userId: users[0]!.id } } },
          { members: { some: { userId: second.id } } },
        ],
      },
    });
    if (!existing) {
      const priv = await prisma.conversation.create({
        data: {
          type: "PRIVATE",
          ownerId: users[0]!.id,
          members: {
            create: [
              { userId: users[0]!.id, role: "OWNER" },
              { userId: second.id, role: "MEMBER" },
            ],
          },
        },
      });
      await prisma.message.create({
        data: {
          conversationId: priv.id,
          senderId: users[0]!.id,
          clientMessageId: randomUUID(),
          body: "Hai! Private chat ini otomatis dibuat oleh seed.",
        },
      });
    }
  }

  console.log(`Seed selesai. ${users.length} user demo, password semua: ${DEMO_PASSWORD}`);
  for (const user of users) {
    console.log(`  - @${user.username} (${user.email})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
