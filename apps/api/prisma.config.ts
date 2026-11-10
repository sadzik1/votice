import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// prisma 7 doesn't read .env automatically
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // migrations need a direct (non-pooled) connection
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
