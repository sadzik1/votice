import { existsSync } from "node:fs";
import { z } from "zod";

if (existsSync(".env")) process.loadEnvFile(".env");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  WEB_DIST_DIR: z.string().optional(),
  // "false" lets a production build run over plain http
  COOKIE_SECURE: z.stringbool().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

export const env = parsed.data;
