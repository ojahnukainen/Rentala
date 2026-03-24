import { describe, it, expect } from "vitest";
import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import { errorHandler } from "./errorHandler";
import { ValidationError, NotFoundError, ConflictError, AppError } from "../errors/AppError";

function buildApp(thrownError: unknown) {
  const app = express();
  app.get("/test", (_req: Request, _res: Response, next: NextFunction) => {
    next(thrownError);
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler middleware", () => {
  it("returns status 400 and correct JSON shape for ValidationError", async () => {
    const app = buildApp(new ValidationError("invalid input"));
    const res = await request(app).get("/test");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { name: "ValidationError", message: "invalid input" },
    });
  });

  it("returns status 404 and correct JSON shape for NotFoundError", async () => {
    const app = buildApp(new NotFoundError("gear not found"));
    const res = await request(app).get("/test");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { name: "NotFoundError", message: "gear not found" },
    });
  });

  it("returns status 409 and correct JSON shape for ConflictError", async () => {
    const app = buildApp(new ConflictError("already booked"));
    const res = await request(app).get("/test");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { name: "ConflictError", message: "already booked" },
    });
  });

  it("returns status 500 and generic message for unknown non-operational errors", async () => {
    const app = buildApp(new Error("database exploded"));
    const res = await request(app).get("/test");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { name: "InternalServerError", message: "An unexpected error occurred"},
    });
  });

  it("does not leak internal error details for unknown errors", async () => {
    const app = buildApp(new Error("secret connection string"));
    const res = await request(app).get("/test");
    expect(res.text).not.toContain("secret connection string");
  });

  it("sets Content-Type to application/json", async () => {
    const app = buildApp(new NotFoundError("not found"));
    const res = await request(app).get("/test");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });
});
