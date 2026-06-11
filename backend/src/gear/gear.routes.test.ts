import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { gearRouter } from "./gear.routes";
import { errorHandler } from "../middleware/errorHandler";
import { Gear, GearClassification, GearStatus, Prisma } from "../generated/prisma/client";

const app = express();
app.use(express.json());
app.use("/gear", gearRouter);
app.use(errorHandler);

const mockGear: Gear = {
  id: "gear-1",
  name: "Sony A7 IV",
  serialNumber: "SN-BODY-001",
  category: "Camera Body",
  status: GearStatus.AVAILABLE,
  classification: GearClassification.EVENT,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /gear", () => {
  it("returns 200 with an array of gear", async () => {
    prismaMock.gear.findMany.mockResolvedValue([mockGear]);

    const res = await request(app).get("/gear");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("gear-1");
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
  const baseBody = {
    name: "Sony A7 IV",
    serialNumber: "SN-BODY-001",
    category: "Camera Body",
    classification: "EVENT",
  };

  it("returns 201 with the created gear object when body is valid", async () => {
    prismaMock.gear.create.mockResolvedValue(mockGear);

    const res = await request(app).post("/gear").send(baseBody);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("gear-1");
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
