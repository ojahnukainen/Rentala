import type { auth } from "../lib/auth";
import type { Role } from "../generated/prisma/client";

// What better-auth actually puts on session.user, with role narrowed from
// better-auth's `string` to the Role enum. requireAuth validates the role
// before attaching, so this type is honest at runtime — unlike the Prisma
// User cast it replaces, which typed role while it was undefined.
export type SessionUser = Omit<typeof auth.$Infer.Session.user, "role"> & {
  role: Role;
};

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}
