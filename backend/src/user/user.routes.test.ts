import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { userRouter } from "./user.routes";
import { errorHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { AppError } from "../errors/AppError";
import { User, Role, Loan } from "../generated/prisma/client";

// ─── Mock requireAuth ─────────────────────────────────────────────────────────
// By default simulates an authenticated user. Individual tests can override
// with mockImplementationOnce to test unauthenticated behaviour.

vi.mock("../middleware/requireAuth", () => ({
  requireAuth: vi.fn(),
}));

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use("/users", userRouter);
app.use(errorHandler);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const now = new Date();

const mockUser: User = {
  id: "user-1",
  email: "alice@cameraclub.fi",
  name: "Alice Virtanen",
  role: Role.MEMBER,
  emailVerified: false,
  image: null,
  createdAt: now,
  updatedAt: now,
};

const mockLoan: Loan = {
  id: "loan-1",
  userId: "user-1",
  startDate: now,
  borrowedAt: null,
  dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  createdAt: now,
  updatedAt: now,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Reset to authenticated as user-1 before each test
beforeEach(() => {
  vi.mocked(requireAuth).mockImplementation((req, _res, next) => {
    req.user = mockUser;
    next();
  });
});

function authenticateAs(user: User) {
  vi.mocked(requireAuth).mockImplementationOnce((req, _res, next) => {
    req.user = user;
    next();
  });
}

const mockAdmin: User = { ...mockUser, id: "admin-1", email: "admin@cameraclub.fi", role: Role.ADMIN };

function unauthenticate() {
  vi.mocked(requireAuth).mockImplementationOnce((_req, _res, next) => {
    next(new AppError("Unauthorized", 401));
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /users", () => {
  it("returns 200 with an array of users for an admin", async () => {
    authenticateAs(mockAdmin);
    prismaMock.user.findMany.mockResolvedValue([mockUser]);

    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("user-1");
  });

  it("returns 401 when the request is not authenticated", async () => {
    unauthenticate();

    const res = await request(app).get("/users");

    expect(res.status).toBe(401);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  // The directory exposes every member's email — members must not see it.
  it("returns 403 for a member and does not query the database", async () => {
    const res = await request(app).get("/users");

    expect(res.status).toBe(403);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /users/:id", () => {
  it("returns 200 with the user object when requesting your own record", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app).get("/users/user-1");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("user-1");
    expect(res.body.email).toBe("alice@cameraclub.fi");
  });

  it("returns 401 when the request is not authenticated", async () => {
    unauthenticate();

    const res = await request(app).get("/users/user-1");

    expect(res.status).toBe(401);
  });

  it("returns 404 when requesting another user's record", async () => {
    const res = await request(app).get("/users/user-2");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { name: "NotFoundError", message: "User with id user-2 not found" },
    });
  });

  it("does not query the database when requesting another user's record", async () => {
    await request(app).get("/users/user-2");

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the authenticated user's own record no longer exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/users/user-1");

    expect(res.status).toBe(404);
    expect(res.body.error.name).toBe("NotFoundError");
  });
});

describe("GET /users/:id/loans", () => {
  it("returns 200 with the loans when requesting your own", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.loan.findMany.mockResolvedValue([mockLoan]);

    const res = await request(app).get("/users/user-1/loans");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("loan-1");
  });

  it("returns 401 when the request is not authenticated", async () => {
    unauthenticate();

    const res = await request(app).get("/users/user-1/loans");

    expect(res.status).toBe(401);
    expect(prismaMock.loan.findMany).not.toHaveBeenCalled();
  });

  it("returns 404 when requesting another user's loans", async () => {
    const res = await request(app).get("/users/user-2/loans");

    expect(res.status).toBe(404);
    expect(res.body.error.name).toBe("NotFoundError");
    expect(prismaMock.loan.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /users", () => {
  // Signup is owned by better-auth at POST /api/auth/sign-up/email. This route
  // was removed because it was unauthenticated and accepted `role: "ADMIN"`
  // straight from the request body. This test guards against reintroduction.
  it("returns 404 because the route no longer exists", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email: "mallory@example.com", name: "Mallory", role: "ADMIN" });

    expect(res.status).toBe(404);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
