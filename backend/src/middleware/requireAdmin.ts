import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { Role } from "../generated/prisma/client";

// Mount after requireAuth. Checks the role requireAuth validated onto req.user.
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new AppError("Unauthorized", 401));
  }

  if (req.user.role !== Role.ADMIN) {
    return next(new AppError("Forbidden", 403));
  }

  next();
}
