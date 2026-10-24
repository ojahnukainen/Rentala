import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { AppError } from "../errors/AppError";
import { Role } from "../generated/prisma/client";

function isRole(value: unknown): value is Role {
  return Object.values(Role).includes(value as Role);
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return next(new AppError("Unauthorized", 401));
  }

  // A session without a valid role means auth.ts no longer exposes it.
  // Fail closed rather than let an undefined role reach requireAdmin.
  const { role } = session.user;
  if (!isRole(role)) {
    return next(new AppError("Unauthorized", 401));
  }

  req.user = { ...session.user, role };
  next();
}
