import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { CreateGearSchema } from "../gear/gear.schema";
import { CreateLoanSchema, ProcessReturnSchema } from "../loan/loan.schema";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ── Reusable response schemas ─────────────────────────────────────────────────

const ErrorResponseSchema = registry.register(
  "ErrorResponse",
  z
    .object({
      error: z.object({ name: z.string(), message: z.string() }),
    })
    .openapi("ErrorResponse")
);

const GearResponseSchema = registry.register(
  "Gear",
  z
    .object({
      id: z.string().openapi({ example: "a1b2c3d4-..." }),
      name: z.string().openapi({ example: "Sony A7 IV" }),
      serialNumber: z.string().openapi({ example: "SN-BODY-001" }),
      category: z.string().openapi({ example: "Camera Body" }),
      status: z
        .enum(["AVAILABLE", "RENTED", "MAINTENANCE", "LOST"])
        .openapi({ example: "AVAILABLE" }),
      classification: z
        .enum(["EVENT", "NON_EVENT"])
        .openapi({ example: "EVENT" }),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    })
    .openapi("Gear")
);

const UserResponseSchema = registry.register(
  "User",
  z
    .object({
      id: z.string().openapi({ example: "a1b2c3d4-..." }),
      email: z.string().openapi({ example: "alice@cameraclub.fi" }),
      name: z.string().openapi({ example: "Alice Virtanen" }),
      role: z.enum(["MEMBER", "ADMIN"]).openapi({ example: "MEMBER" }),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    })
    .openapi("User")
);

const LoanResponseSchema = registry.register(
  "Loan",
  z
    .object({
      id: z.string().openapi({ example: "a1b2c3d4-..." }),
      userId: z.string().openapi({ example: "a1b2c3d4-..." }),
      startDate: z.iso.datetime().openapi({ description: "Booking period start" }),
      borrowedAt: z.iso.datetime().nullable().openapi({ description: "Actual pickup timestamp; null until picked up" }),
      dueDate: z.iso.datetime(),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    })
    .openapi("Loan")
);

const ReturnResultSchema = registry.register(
  "ReturnResult",
  z
    .object({ count: z.number().openapi({ example: 2 }) })
    .openapi("ReturnResult")
);

const LoanStatsResponseSchema = registry.register(
  "LoanStats",
  z
    .object({
      activeLoans: z.number().int().nonnegative().openapi({ example: 432 }),
    })
    .openapi("LoanStats")
);

// ── Shared error responses ────────────────────────────────────────────────────

const responses400 = {
  400: {
    description: "Validation error",
    content: { "application/json": { schema: ErrorResponseSchema } },
  },
};

const responses401 = {
  401: {
    description: "Unauthenticated",
    content: { "application/json": { schema: ErrorResponseSchema } },
  },
};

const responses404 = {
  404: {
    description: "Not found",
    content: { "application/json": { schema: ErrorResponseSchema } },
  },
};

const responses409 = {
  409: {
    description: "Conflict",
    content: { "application/json": { schema: ErrorResponseSchema } },
  },
};

// ── Auth routes ───────────────────────────────────────────────────────────────

const AuthUserSchema = registry.register(
  "AuthUser",
  z
    .object({
      id: z.string().openapi({ example: "abc123" }),
      email: z.string().openapi({ example: "alice@cameraclub.fi" }),
      name: z.string().openapi({ example: "Alice Virtanen" }),
      emailVerified: z.boolean(),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    })
    .openapi("AuthUser")
);

const AuthResponseSchema = registry.register(
  "AuthResponse",
  z
    .object({
      token: z.string().openapi({ example: "eyJhbGci..." }),
      user: AuthUserSchema,
    })
    .openapi("AuthResponse")
);

registry.registerPath({
  method: "post",
  path: "/api/auth/sign-up/email",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().openapi({ example: "alice@cameraclub.fi" }),
            password: z.string().min(8).openapi({ example: "password123" }),
            name: z.string().openapi({ example: "Alice Virtanen" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Registration successful",
      content: { "application/json": { schema: AuthResponseSchema } },
    },
    422: {
      description: "Email already registered",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/sign-in/email",
  tags: ["Auth"],
  summary: "Sign in with email and password",
  description: "Returns user data and sets an HTTP-only `better-auth.session_token` cookie.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().openapi({ example: "alice@cameraclub.fi" }),
            password: z.string().openapi({ example: "password123" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful — session cookie is set",
      content: { "application/json": { schema: AuthResponseSchema } },
    },
    401: {
      description: "Invalid credentials",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ── Gear routes ───────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/v1/gear",
  tags: ["Gear"],
  summary: "List all gear",
  responses: {
    200: {
      description: "Array of all gear items",
      content: {
        "application/json": { schema: z.array(GearResponseSchema) },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/gear/{id}",
  tags: ["Gear"],
  summary: "Get a single gear item by ID",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Gear item",
      content: { "application/json": { schema: GearResponseSchema } },
    },
    ...responses404,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/gear",
  tags: ["Gear"],
  summary: "Create a new gear item",
  description: "Requires an authenticated session.",
  request: {
    body: {
      content: { "application/json": { schema: CreateGearSchema } },
    },
  },
  responses: {
    201: {
      description: "Created gear item",
      content: { "application/json": { schema: GearResponseSchema } },
    },
    ...responses400,
    ...responses401,
    ...responses409,
  },
});

// ── User routes ───────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/v1/users",
  tags: ["Users"],
  summary: "List all users",
  description: "Requires an authenticated session.",
  responses: {
    200: {
      description: "Array of all users",
      content: {
        "application/json": { schema: z.array(UserResponseSchema) },
      },
    },
    ...responses401,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/users/{id}",
  tags: ["Users"],
  summary: "Get a single user by ID",
  description:
    "Requires an authenticated session, and members may read only their own record. Requesting another user's id returns 404 rather than 403 so the response does not confirm whether that user exists.",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "User",
      content: { "application/json": { schema: UserResponseSchema } },
    },
    ...responses401,
    ...responses404,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/users/{id}/loans",
  tags: ["Users", "Loans"],
  summary: "Get all loans for a specific user",
  description:
    "Requires an authenticated session, and members may read only their own loans. Requesting another user's id returns 404 rather than 403 so the response does not confirm whether that user exists.",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Array of loans with items and gear details",
      content: {
        "application/json": { schema: z.array(LoanResponseSchema) },
      },
    },
    ...responses401,
    ...responses404,
  },
});

// ── Loan routes ───────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/v1/loans/stats",
  tags: ["Loans"],
  summary: "Get aggregate loan statistics",
  description: "Returns counts used by the admin dashboard.",
  responses: {
    200: {
      description: "Aggregate stats",
      content: { "application/json": { schema: LoanStatsResponseSchema } },
    },
    401: {
      description: "Unauthenticated",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/loans",
  tags: ["Loans"],
  summary: "Create a new loan (checkout)",
  description:
    "Creates a loan for one or more gear items. Requires an authenticated session; userId is taken from that session. Availability is checked by date-range overlap — a currently rented item can still be booked if its existing loan ends before the requested period.",
  request: {
    body: {
      content: { "application/json": { schema: CreateLoanSchema } },
    },
  },
  responses: {
    201: {
      description: "Created loan",
      content: { "application/json": { schema: LoanResponseSchema } },
    },
    ...responses400,
    ...responses401,
    ...responses404,
    ...responses409,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/loans/{id}/pickup",
  tags: ["Loans"],
  summary: "Pick up a loan (mark as borrowed)",
  description:
    "Sets borrowedAt to the current timestamp and updates all gear items in the loan to RENTED status. Fails if the loan is already picked up. Requires an authenticated session, and members may pick up only their own loans — another member's loan id returns 404 rather than 403.",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Updated loan with borrowedAt set",
      content: { "application/json": { schema: LoanResponseSchema } },
    },
    ...responses401,
    ...responses404,
    ...responses409,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/loans/returns",
  tags: ["Loans"],
  summary: "Return loan items (partial or full)",
  description:
    "Marks specific LoanItems as RETURNED and sets the underlying gear back to AVAILABLE. Pass a subset of a loan's items for a partial return, or all items for a full return. Requires an authenticated session, and members may return only items on their own loans — an item belonging to another member returns 404 rather than 403, so the response does not confirm whether that item exists.",
  request: {
    body: {
      content: { "application/json": { schema: ProcessReturnSchema } },
    },
  },
  responses: {
    200: {
      description: "Number of items returned",
      content: { "application/json": { schema: ReturnResultSchema } },
    },
    ...responses400,
    ...responses401,
    ...responses404,
    ...responses409,
  },
});

// ── Generate document ─────────────────────────────────────────────────────────

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Camera Club Gear Rental API",
    version: "1.0.0",
    description: "API for managing gear loans in a camera club.",
  },
  servers: [{ url: "http://localhost:3000" }],
});
