import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL must be set to connect to the database.");
    }

    prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
        connectionTimeoutMillis: 2000,
      }),
    });
  }

  return prisma;
}

export async function checkDatabaseConnection(): Promise<void> {
  await getPrismaClient().$queryRaw`SELECT 1`;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}
