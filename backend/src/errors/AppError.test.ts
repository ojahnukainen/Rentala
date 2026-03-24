import { describe, it, expect } from "vitest";
import { AppError, ValidationError, NotFoundError, ConflictError } from "./AppError";

describe("AppError base class", () => {
  it("constructs with the correct message, statusCode, and isOperational flag", () => {
    const err = new AppError("something went wrong", 418);
    expect(err.message).toBe("something went wrong");
    expect(err.statusCode).toBe(418);
    expect(err.isOperational).toBe(true);
  });

  it("is an instance of Error", () => {
    const err = new AppError("oops", 500);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("ValidationError", () => {
  it("sets statusCode to 400", () => {
    const err = new ValidationError("invalid input");
    expect(err.statusCode).toBe(400);
  });

  it("sets name to ValidationError", () => {
    const err = new ValidationError("invalid input");
    expect(err.name).toBe("ValidationError");
  });
});

describe("NotFoundError", () => {
  it("sets statusCode to 404", () => {
    const err = new NotFoundError("resource not found");
    expect(err.statusCode).toBe(404);
  });

  it("sets name to NotFoundError", () => {
    const err = new NotFoundError("resource not found");
    expect(err.name).toBe("NotFoundError");
  });
});

describe("ConflictError", () => {
  it("sets statusCode to 409", () => {
    const err = new ConflictError("already exists");
    expect(err.statusCode).toBe(409);
  });

  it("sets name to ConflictError", () => {
    const err = new ConflictError("already exists");
    expect(err.name).toBe("ConflictError");
  });
});
