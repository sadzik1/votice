import type { CookieOptions, RequestHandler } from "express";
import type { Db } from "../db.js";
import { unauthorized } from "../lib/http-error.js";
import { findUserBySessionToken } from "../services/sessions.js";

export const SESSION_COOKIE = "sid";

export function sessionCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: "lax", secure, path: "/" };
}

export function loadUser(db: Db): RequestHandler {
  return async (req, _res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === "string" && token.length > 0) {
      req.user = (await findUserBySessionToken(db, token)) ?? undefined;
    }
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw unauthorized();
  next();
};

export function currentUserId(req: { user?: { id: string } }): string {
  if (!req.user) throw unauthorized();
  return req.user.id;
}
