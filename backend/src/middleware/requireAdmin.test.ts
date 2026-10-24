import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { requireAdmin } from "./requireAdmin";
import { Role } from "../generated/prisma/client";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeUser(role: Role): NonNullable<Request["user"]> {
  return {
    id: "user-1",
    email: "alice@cameraclub.fi",
    name: "Alice Virtanen",
    role,
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeReq(user?: Request["user"]): Request {
  return { user } as unknown as Request;
}

function makeNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

function errorPassedTo(next: NextFunction): AppError {
  return vi.mocked(next).mock.calls[0][0] as unknown as AppError;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("requireAdmin middleware", () => {
  it("calls next() with no arguments for an ADMIN user", () => {
    const next = makeNext();

    requireAdmin(makeReq(makeUser(Role.ADMIN)), {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("passes a 403 AppError for a MEMBER user", () => {
    const next = makeNext();

    requireAdmin(makeReq(makeUser(Role.MEMBER)), {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(errorPassedTo(next)).toBeInstanceOf(AppError);
    expect(errorPassedTo(next).statusCode).toBe(403);
  });

  // requireAdmin is meant to run after requireAuth. If it is ever mounted on
  // its own, a missing user must fail closed as 401 rather than slip through.
  it("passes a 401 AppError when there is no user on the request", () => {
    const next = makeNext();

    requireAdmin(makeReq(undefined), {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(errorPassedTo(next).statusCode).toBe(401);
  });
});
