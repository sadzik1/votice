import { loginInputSchema, registerInputSchema } from "@survey/shared";
import { type Response, Router } from "express";
import type { AppDeps } from "../app.js";
import { conflict, HttpError } from "../lib/http-error.js";
import { getDummyHash, hashPassword, verifyPassword } from "../lib/password.js";
import { isUniqueViolation } from "../lib/prisma-errors.js";
import { requireAuth, SESSION_COOKIE, sessionCookieOptions } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { createSession, deleteSession, publicUserSelect } from "../services/sessions.js";

export function authRouter({ db, config }: AppDeps): Router {
  const router = Router();
  const limiter = createRateLimiter(config.rateLimits.auth);
  const cookieOptions = sessionCookieOptions(config.secureCookies);

  async function startSession(res: Response, userId: string): Promise<void> {
    const { token, expiresAt } = await createSession(db, userId);
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
  }

  router.post("/register", limiter, async (req, res) => {
    const input = registerInputSchema.parse(req.body);

    try {
      const user = await db.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: await hashPassword(input.password),
        },
        select: publicUserSelect,
      });
      await startSession(res, user.id);
      res.status(201).json({ user });
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict("This email is already registered");
      throw error;
    }
  });

  router.post("/login", limiter, async (req, res) => {
    const input = loginInputSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { email: input.email } });
    const passwordOk = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await getDummyHash()),
    );

    if (!user || !passwordOk) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    await startSession(res, user.id);
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  });

  router.post("/logout", async (req, res) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === "string") await deleteSession(db, token);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
