import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { AppError } from "../errors/AppError";
import type { User } from "../generated/prisma/client";

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

  req.user = session.user as unknown as User;
  next();
}
