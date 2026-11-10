import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export type Db = PrismaClient;

export function poolMaxFromEnv(value = process.env.DATABASE_POOL_MAX): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function createDb(connectionString: string, options: { poolMax?: number } = {}): Db {
  const adapter = new PrismaPg({
    connectionString,
    // neon needs a moment to wake up after being idle
    connectionTimeoutMillis: 10_000,
    // prisma dev only handles one connection at a time
    ...(options.poolMax && { max: options.poolMax }),
  });
  return new PrismaClient({ adapter });
}

export async function isDbReachable(db: Db): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
