import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import "./__mocks__/prisma";

// Verifies the wiring in src/index.ts, not just the helpers in
// middleware/apiDocs.ts: the mount decision is made at import time from the
// environment, so each case re-imports the app with a different env.

const DOCS_VARS = ["API_DOCS_USER", "API_DOCS_PASSWORD", "API_DOCS_PUBLIC"] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(DOCS_VARS.map((k) => [k, process.env[k]]));
  for (const k of DOCS_VARS) delete process.env[k];
});

afterEach(() => {
  for (const k of DOCS_VARS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

async function loadApp(): Promise<Express> {
  vi.resetModules();
  const mod = await import("./index");
  return mod.app;
}

function encode(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

describe("GET /api-docs", () => {
  it("is not mounted when nothing is configured", async () => {
    const app = await loadApp();

    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(404);
  });

  it("is not mounted when only one credential is configured", async () => {
    process.env.API_DOCS_USER = "docs";
    const app = await loadApp();

    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(404);
  });

  it("is served without credentials on the explicit public opt-in", async () => {
    process.env.API_DOCS_PUBLIC = "true";
    const app = await loadApp();

    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(200);
  });

  it("challenges for credentials when protected", async () => {
    process.env.API_DOCS_USER = "docs";
    process.env.API_DOCS_PASSWORD = "s3cret";
    const app = await loadApp();

    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toMatch(/Basic/);
  });

  it("serves the docs when the correct credentials are supplied", async () => {
    process.env.API_DOCS_USER = "docs";
    process.env.API_DOCS_PASSWORD = "s3cret";
    const app = await loadApp();

    const res = await request(app)
      .get("/api-docs/")
      .set("Authorization", encode("docs", "s3cret"));

    expect(res.status).toBe(200);
  });

  it("rejects wrong credentials when protected", async () => {
    process.env.API_DOCS_USER = "docs";
    process.env.API_DOCS_PASSWORD = "s3cret";
    const app = await loadApp();

    const res = await request(app)
      .get("/api-docs/")
      .set("Authorization", encode("docs", "wrong"));

    expect(res.status).toBe(401);
  });

  // The public opt-in must not override configured credentials.
  it("still requires credentials when both the opt-in and credentials are set", async () => {
    process.env.API_DOCS_USER = "docs";
    process.env.API_DOCS_PASSWORD = "s3cret";
    process.env.API_DOCS_PUBLIC = "true";
    const app = await loadApp();

    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(401);
  });
});
