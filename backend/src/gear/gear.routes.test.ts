import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { gearRouter } from "./gear.routes";
import { errorHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/requireAuth";
import { AppError } from "../errors/AppError";
import { Gear, GearClassification, GearStatus, Prisma, Role, User } from "../generated/prisma/client";

// ─── Mock requireAuth ─────────────────────────────────────────────────────────
// Only POST /gear is gated. The GET routes stay public so members can browse
// the catalogue before signing in.

vi.mock("../middleware/requireAuth", () => ({
  requireAuth: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use("/gear", gearRouter);
app.use(errorHandler);

const now = new Date();

const mockUser: User = {
  id: "user-1",
  email: "alice@cameraclub.fi",
  name: "Alice Virtanen",
  role: Role.MEMBER,
  emailVerified: true,
  image: null,
  createdAt: now,
  updatedAt: now,
};

const mockGear: Gear = {
  id: "gear-1",
  name: "Sony A7 IV",
  serialNumber: "SN-BODY-001",
  category: "Camera Body",
  status: GearStatus.AVAILABLE,
  classification: GearClassification.EVENT,
  createdAt: now,
  updatedAt: now,
};

// Reset to authenticated before each test
beforeEach(() => {
  vi.mocked(requireAuth).mockImplementation((req, _res, next) => {
    req.user = mockUser;
    next();
  });
});

const mockAdmin: User = { ...mockUser, id: "admin-1", email: "admin@cameraclub.fi", role: Role.ADMIN };

function unauthenticate() {
  vi.mocked(requireAuth).mockImplementationOnce((_req, _res, next) => {
    next(new AppError("Unauthorized", 401));
  });
}

describe("GET /gear", () => {
  it("returns 200 with an array of gear", async () => {
    prismaMock.gear.findMany.mockResolvedValue([mockGear]);

    const res = await request(app).get("/gear");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("gear-1");
  });

  // The gear list must stay reachable without a session — /gear has no route
  // guard on the frontend and the checkout flow is what redirects to login.
  it("stays public: does not run requireAuth", async () => {
    prismaMock.gear.findMany.mockResolvedValue([mockGear]);

    const res = await request(app).get("/gear");

    expect(res.status).toBe(200);
    expect(vi.mocked(requireAuth)).not.toHaveBeenCalled();
  });
});

describe("GET /gear/:id", () => {
  it("returns 200 with the gear object when found", async () => {
    prismaMock.gear.findUnique.mockResolvedValue(mockGear);

    const res = await request(app).get("/gear/gear-1");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("gear-1");
    expect(res.body.name).toBe("Sony A7 IV");
  });

  it("returns 404 JSON error when gear does not exist", async () => {
    prismaMock.gear.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/gear/missing-id");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { name: "NotFoundError", message: "Gear with id missing-id not found" },
    });
  });
});

describe("POST /gear", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockImplementation((req, _res, next) => {
      req.user = mockAdmin;
      next();
    });
  });

  const baseBody = {
    name: "Sony A7 IV",
    serialNumber: "SN-BODY-001",
    category: "Camera Body",
    classification: "EVENT",
  };

  it("returns 201 with the created gear object when authenticated and body is valid", async () => {
    prismaMock.gear.create.mockResolvedValue(mockGear);

    const res = await request(app).post("/gear").send(baseBody);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("gear-1");
  });

  it("returns 401 when the request is not authenticated", async () => {
    unauthenticate();

    const res = await request(app).post("/gear").send(baseBody);

    expect(res.status).toBe(401);
    expect(prismaMock.gear.create).not.toHaveBeenCalled();
  });

  it("returns 403 for a member and does not create the gear", async () => {
    vi.mocked(requireAuth).mockImplementationOnce((req, _res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await request(app).post("/gear").send(baseBody);

    expect(res.status).toBe(403);
    expect(prismaMock.gear.create).not.toHaveBeenCalled();
  });

  it("returns 400 when name is missing", async () => {
    const { name: _omit, ...body } = baseBody;
    const res = await request(app).post("/gear").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/name/);
  });

  it("returns 400 when serialNumber is missing", async () => {
    const { serialNumber: _omit, ...body } = baseBody;
    const res = await request(app).post("/gear").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/serialNumber/);
  });

  it("returns 400 when category is missing", async () => {
    const { category: _omit, ...body } = baseBody;
    const res = await request(app).post("/gear").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/category/);
  });

  it("returns 400 when classification is missing", async () => {
    const { classification: _omit, ...body } = baseBody;
    const res = await request(app).post("/gear").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/classification/);
  });

  it("returns 400 when classification is not a valid enum value", async () => {
    const res = await request(app).post("/gear").send({ ...baseBody, classification: "WHATEVER" });

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/classification/);
  });

  it("returns 409 when prisma rejects with P2002 (duplicate serial number)", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "0",
    });
    prismaMock.gear.create.mockRejectedValue(p2002);

    const res = await request(app).post("/gear").send(baseBody);

    expect(res.status).toBe(409);
    expect(res.body.error.name).toBe("ConflictError");
    expect(res.body.error.message).toMatch(/SN-BODY-001/);
  });
});
