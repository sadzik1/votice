import type { PublicUser } from "@survey/shared";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}
