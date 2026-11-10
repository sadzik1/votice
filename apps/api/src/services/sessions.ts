import type { PublicUser } from "@survey/shared";
import type { Db } from "../db.js";
import { randomToken, sha256 } from "../lib/tokens.js";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const publicUserSelect = { id: true, email: true, name: true } as const;

export async function createSession(db: Db, userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function findUserBySessionToken(db: Db, token: string): Promise<PublicUser | null> {
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: { id: true, expiresAt: true, user: { select: publicUserSelect } },
  });
  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
}
