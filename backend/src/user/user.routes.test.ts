import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { userRouter } from "./user.routes";
import { errorHandler } from "../middleware/errorHandler";
import { User, Role } from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";

const app = express();
app.use(express.json());
app.use("/users", userRouter);
app.use(errorHandler);

const mockUser: User = {
  id: "user-1",
  email: "alice@cameraclub.fi",
  name: "Alice Virtanen",
  role: Role.MEMBER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /users", () => {
  it("returns 200 with an array of users", async () => {
    prismaMock.user.findMany.mockResolvedValue([mockUser]);

    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("user-1");
  });
});

describe("GET /users/:id", () => {
  it("returns 200 with the user object when found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app).get("/users/user-1");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("user-1");
    expect(res.body.email).toBe("alice@cameraclub.fi");
  });

  it("returns 404 JSON error when user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/users/missing-id");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { name: "NotFoundError", message: "User with id missing-id not found" },
    });
  });
});

describe("POST /users", () => {
  it("returns 201 with the created user when body is valid", async () => {
    prismaMock.user.create.mockResolvedValue(mockUser);

    const res = await request(app)
      .post("/users")
      .send({ email: "alice@cameraclub.fi", name: "Alice Virtanen", role: "MEMBER" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("user-1");
  });

  it("returns 400 when role is missing", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email: "alice@cameraclub.fi", name: "Alice Virtanen" });

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/role/);
  });

  it("returns 400 when role is not MEMBER or ADMIN", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email: "alice@cameraclub.fi", name: "Alice Virtanen", role: "SUPERUSER" });

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/role/);
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/users")
      .send({ name: "Alice Virtanen" });

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/email/);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email: "alice@cameraclub.fi" });

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/name/);
  });

  it("returns 400 when email is not a valid email format", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email: "not-an-email", name: "Alice Virtanen" });

    expect(res.status).toBe(400);
    expect(res.body.error.name).toBe("ValidationError");
    expect(res.body.error.message).toMatch(/email/);
  });

  it("returns 409 when the email already exists", async () => {
    const uniqueViolation = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "7.0.0", meta: { target: ["email"] } }
    );
    prismaMock.user.create.mockRejectedValue(uniqueViolation);

    const res = await request(app)
      .post("/users")
      .send({ email: "alice@cameraclub.fi", name: "Alice Virtanen", role: "MEMBER" });

    expect(res.status).toBe(409);
    expect(res.body.error.name).toBe("ConflictError");
  });
});
