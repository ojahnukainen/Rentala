import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { loanRouter } from "./loan.routes";
import { errorHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { AppError } from "../errors/AppError";
import {
  Loan,
  LoanItem,
  ItemStatus,
  GearStatus,
  Role,
} from "../generated/prisma/client";

// ─── Mock requireAuth ─────────────────────────────────────────────────────────
// By default simulates an authenticated user. Individual tests can override
// with mockImplementationOnce to test unauthenticated behaviour.

vi.mock("../middleware/requireAuth", () => ({
  requireAuth: vi.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const now = new Date();
const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

const mockUser = {
  id: "user-1",
  email: "alice@cameraclub.fi",
  name: "Alice Virtanen",
  role: Role.ADMIN,
  emailVerified: true,
  image: null as string | null,
  createdAt: now,
  updatedAt: now,
};

const mockLoan: Loan = {
  id: "loan-1",
  userId: "user-1",
  startDate: inOneWeek,
  borrowedAt: null,
  dueDate: inTwoWeeks,
  createdAt: now,
  updatedAt: now,
};

const mockLoanItem: LoanItem = {
  id: "loan-item-1",
  loanId: "loan-1",
  gearId: "camera-1",
  status: ItemStatus.ACTIVE,
  returnedAt: null,
};

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use("/loans", loanRouter);
app.use(errorHandler);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupTransaction() {
  prismaMock.$transaction.mockImplementation(
    (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Reset to authenticated before each test
beforeEach(() => {
  vi.mocked(requireAuth).mockImplementation((req, _res, next) => {
    req.user = mockUser;
    next();
  });
});

// ── POST /loans ───────────────────────────────────────────────────────────────

describe("POST /loans", () => {
  it("returns 201 with the created loan when authenticated and body is valid", async () => {
    setupTransaction();
    prismaMock.gear.findMany.mockResolvedValue([
      {
        id: "camera-1",
        name: "Sony A7 IV",
        serialNumber: "SN-001",
        category: "Camera Body",
        status: GearStatus.AVAILABLE,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    prismaMock.loanItem.findMany.mockResolvedValue([]);
    prismaMock.loan.create.mockResolvedValue(mockLoan);
    prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post("/loans")
      .send({
        gearIds: ["camera-1"],
        startDate: inOneWeek.toISOString(),
        dueDate: inTwoWeeks.toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("loan-1");
    expect(res.body.userId).toBe("user-1");
  });

  it("returns 401 when the request is not authenticated", async () => {
    vi.mocked(requireAuth).mockImplementationOnce((_req, _res, next) => {
      next(new AppError("Unauthorized", 401));
    });

    const res = await request(app)
      .post("/loans")
      .send({
        gearIds: ["camera-1"],
        startDate: inOneWeek.toISOString(),
        dueDate: inTwoWeeks.toISOString(),
      });

    expect(res.status).toBe(401);
  });

  it("returns 400 when gearIds is missing", async () => {
    const res = await request(app)
      .post("/loans")
      .send({ startDate: inOneWeek.toISOString(), dueDate: inTwoWeeks.toISOString() });

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
  });

  it("returns 400 when startDate is missing", async () => {
    const res = await request(app)
      .post("/loans")
      .send({ gearIds: ["camera-1"], dueDate: inTwoWeeks.toISOString() });

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
  });

  it("returns 400 when dueDate is missing", async () => {
    const res = await request(app)
      .post("/loans")
      .send({ gearIds: ["camera-1"], startDate: inOneWeek.toISOString() });

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
  });

  it("returns 404 when a requested gear ID does not exist", async () => {
    prismaMock.gear.findMany.mockResolvedValue([]);
    prismaMock.loanItem.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post("/loans")
      .send({
        gearIds: ["nonexistent-id"],
        startDate: inOneWeek.toISOString(),
        dueDate: inTwoWeeks.toISOString(),
      });

    expect(res.status).toBe(404);
  });

  it("returns 409 when a gear item has an overlapping booking", async () => {
    prismaMock.gear.findMany.mockResolvedValue([
      {
        id: "camera-1",
        name: "Sony A7 IV",
        serialNumber: "SN-001",
        category: "Camera Body",
        status: GearStatus.AVAILABLE,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    prismaMock.loanItem.findMany.mockResolvedValue([mockLoanItem]);

    const res = await request(app)
      .post("/loans")
      .send({
        gearIds: ["camera-1"],
        startDate: inOneWeek.toISOString(),
        dueDate: inTwoWeeks.toISOString(),
      });

    expect(res.status).toBe(409);
  });
});

// ── POST /loans/:id/pickup ────────────────────────────────────────────────────

describe("POST /loans/:id/pickup", () => {
  it("returns 200 with the updated loan when authenticated and loan is pending", async () => {
    setupTransaction();
    const pendingLoan = { ...mockLoan, items: [mockLoanItem] };
    prismaMock.loan.findUnique.mockResolvedValue(pendingLoan as unknown as Loan);
    prismaMock.loan.update.mockResolvedValue({ ...mockLoan, borrowedAt: now });
    prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app).post("/loans/loan-1/pickup");

    expect(res.status).toBe(200);
    expect(res.body.borrowedAt).not.toBeNull();
  });

  it("returns 401 when the request is not authenticated", async () => {
    vi.mocked(requireAuth).mockImplementationOnce((_req, _res, next) => {
      next(new AppError("Unauthorized", 401));
    });

    const res = await request(app).post("/loans/loan-1/pickup");

    expect(res.status).toBe(401);
  });

  it("returns 404 when the loan does not exist", async () => {
    prismaMock.loan.findUnique.mockResolvedValue(null);

    const res = await request(app).post("/loans/nonexistent-id/pickup");

    expect(res.status).toBe(404);
  });

  it("returns 409 when the loan has already been picked up", async () => {
    const alreadyPickedUp = { ...mockLoan, borrowedAt: now, items: [mockLoanItem] };
    prismaMock.loan.findUnique.mockResolvedValue(alreadyPickedUp as unknown as Loan);

    const res = await request(app).post("/loans/loan-1/pickup");

    expect(res.status).toBe(409);
  });
});

// ── POST /loans/returns ───────────────────────────────────────────────────────

describe("POST /loans/returns", () => {
  it("returns 200 with the return count when authenticated and items are valid", async () => {
    setupTransaction();
    prismaMock.loanItem.findMany.mockResolvedValue([mockLoanItem]);
    prismaMock.loanItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post("/loans/returns")
      .send({ loanItemIds: ["loan-item-1"] });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it("returns 401 when the request is not authenticated", async () => {
    vi.mocked(requireAuth).mockImplementationOnce((_req, _res, next) => {
      next(new AppError("Unauthorized", 401));
    });

    const res = await request(app)
      .post("/loans/returns")
      .send({ loanItemIds: ["loan-item-1"] });

    expect(res.status).toBe(401);
  });

  it("returns 400 when loanItemIds is missing", async () => {
    const res = await request(app).post("/loans/returns").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
  });

  it("returns 404 when a loan item ID does not exist", async () => {
    prismaMock.loanItem.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post("/loans/returns")
      .send({ loanItemIds: ["nonexistent-id"] });

    expect(res.status).toBe(404);
  });

  it("returns 409 when a loan item has already been returned", async () => {
    const alreadyReturned: LoanItem = {
      ...mockLoanItem,
      status: ItemStatus.RETURNED,
      returnedAt: now,
    };
    prismaMock.loanItem.findMany.mockResolvedValue([alreadyReturned]);

    const res = await request(app)
      .post("/loans/returns")
      .send({ loanItemIds: ["loan-item-1"] });

    expect(res.status).toBe(409);
  });
});

describe("GET /loans/stats", () => {
  it("returns 200 with the active loans count for an authenticated user", async () => {
    prismaMock.loan.count.mockResolvedValue(3);

    const res = await request(app).get("/loans/stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ activeLoans: 3 });
  });

  it("returns 401 for an unauthenticated request", async () => {
    vi.mocked(requireAuth).mockImplementationOnce((_req, _res, next) => {
      next(new AppError("Unauthorized", 401));
    });

    const res = await request(app).get("/loans/stats");

    expect(res.status).toBe(401);
  });
});
