import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

// Mock the auth module before importing the middleware so the middleware picks
// up the mock when it imports auth.
vi.mock("../lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { auth } from "../lib/auth";
import { requireAuth } from "./requireAuth";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser = {
  id: "user-1",
  email: "alice@cameraclub.fi",
  name: "Alice Virtanen",
  role: "MEMBER",
  emailVerified: true,
  image: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSession = {
  session: {
    id: "session-1",
    userId: "user-1",
    token: "mock-token",
    expiresAt: new Date(Date.now() + 3_600_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: null as string | null,
    userAgent: null as string | null,
  },
  user: mockUser,
};

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.mocked(auth.api.getSession).mockReset();
  });

  // ── Valid session ─────────────────────────────────────────────────────────

  describe("valid session", () => {
    it("calls next() with no arguments when the session is valid", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);
      const req = makeReq({ cookie: "better-auth.session_token=valid-token" });
      const next = makeNext();

      await requireAuth(req, {} as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("attaches session.user to req.user", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);
      const req = makeReq({ cookie: "better-auth.session_token=valid-token" });

      await requireAuth(req, {} as Response, makeNext());

      expect((req as Request & { user: typeof mockUser }).user).toEqual(mockUser);
    });

    it("calls getSession with the request headers", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);
      const req = makeReq({ cookie: "better-auth.session_token=valid-token" });

      await requireAuth(req, {} as Response, makeNext());

      expect(auth.api.getSession).toHaveBeenCalledOnce();
    });
  });

  // ── Role ──────────────────────────────────────────────────────────────────
  // better-auth only puts `role` on the session user because auth.ts declares
  // it as an additional field. If that config ever regresses, role arrives as
  // undefined — which must fail closed rather than reach requireAdmin.

  describe("role on the session user", () => {
    it("carries the ADMIN role through to req.user", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        ...mockSession,
        user: { ...mockUser, role: "ADMIN" },
      });
      const req = makeReq();

      await requireAuth(req, {} as Response, makeNext());

      expect(req.user?.role).toBe("ADMIN");
    });

    it("passes a 401 AppError when the session user has no role", async () => {
      const { role: _omit, ...userWithoutRole } = mockUser;
      vi.mocked(auth.api.getSession).mockResolvedValue({
        ...mockSession,
        user: userWithoutRole,
      } as unknown as typeof mockSession);
      const req = makeReq();
      const next = makeNext();

      await requireAuth(req, {} as Response, next);

      expect((vi.mocked(next).mock.calls[0][0] as unknown as AppError).statusCode).toBe(401);
      expect(req.user).toBeUndefined();
    });

    it("passes a 401 AppError when the session user has an unknown role", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        ...mockSession,
        user: { ...mockUser, role: "SUPERUSER" },
      });
      const req = makeReq();
      const next = makeNext();

      await requireAuth(req, {} as Response, next);

      expect((vi.mocked(next).mock.calls[0][0] as unknown as AppError).statusCode).toBe(401);
      expect(req.user).toBeUndefined();
    });
  });

  // ── Invalid / missing session ─────────────────────────────────────────────

  describe("missing or invalid session", () => {
    it("calls next() with an AppError when getSession returns null", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
      const next = makeNext();

      await requireAuth(makeReq(), {} as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it("the AppError has statusCode 401", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
      const next = makeNext();

      await requireAuth(makeReq(), {} as Response, next);

      const err = vi.mocked(next).mock.calls[0][0] as AppError;
      expect(err.statusCode).toBe(401);
    });

    it("does not call next() without an error on a null session", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
      const next = makeNext();

      await requireAuth(makeReq(), {} as Response, next);

      // next was called once — with the error, not without args
      expect(next).toHaveBeenCalledOnce();
      expect(next).not.toHaveBeenCalledWith();
    });

    it("does not attach req.user when the session is missing", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
      const req = makeReq();

      await requireAuth(req, {} as Response, makeNext());

      expect((req as Record<string, unknown>).user).toBeUndefined();
    });
  });
});
