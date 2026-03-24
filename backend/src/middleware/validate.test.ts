import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "./validate";
import { ValidationError } from "../errors/AppError";

const testSchema = z.object({
  name: z.string(),
  age: z.number(),
});

function buildMocks(body: unknown) {
  const req = { body } as Request;
  const res = {} as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("validate middleware", () => {
  it("calls next() with no error when body matches the schema", () => {
    const { req, res, next } = buildMocks({ name: "Alice", age: 30 });
    validate(testSchema)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next(ValidationError) when a required field is missing", () => {
    const { req, res, next } = buildMocks({ name: "Alice" });
    validate(testSchema)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    const err = vi.mocked(next).mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
  });

  it("calls next(ValidationError) when a field has the wrong type", () => {
    const { req, res, next } = buildMocks({ name: "Alice", age: "not-a-number" });
    validate(testSchema)(req, res, next);
    const err = vi.mocked(next).mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
  });

  it("includes the field path and Zod issue description in the error message", () => {
    const { req, res, next } = buildMocks({ name: "Alice" });
    validate(testSchema)(req, res, next);
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ValidationError;
    expect(err.message).toMatch(/age/);
  });

  it("does not mutate req.body when validation passes", () => {
    const body = { name: "Alice", age: 30 };
    const { req, res, next } = buildMocks(body);
    validate(testSchema)(req, res, next);
    expect(req.body).toEqual({ name: "Alice", age: 30 });
  });

  it("calls next(ValidationError) for an empty body against a schema with required fields", () => {
    const { req, res, next } = buildMocks({});
    validate(testSchema)(req, res, next);
    const err = vi.mocked(next).mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
  });
});
