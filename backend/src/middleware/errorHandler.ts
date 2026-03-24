import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      error: { name: err.name, message: err.message },
    });
    return;
  }

  res.status(500).json({
    error: { name: "InternalServerError", message: "An unexpected error occurred", details: err },
  });
}
