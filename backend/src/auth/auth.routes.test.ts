import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth";
import prisma from "../lib/prisma";

// Auth handler MUST be mounted before express.json() — better-auth reads the
// raw request body itself and conflicts with Express's body parser.
const app = express();
app.all("/api/auth/*path", toNodeHandler(auth));
app.use(express.json());

const TEST_USER = {
  email: "auth-test@example.com",
  password: "password123",
  name: "Auth Test User",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Auth Routes", () => {
  // Session and Account have onDelete: Cascade from User, so deleting the
  // test user is enough to clean up all related rows.
  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
  });

  // ── POST /api/auth/sign-up/email ─────────────────────────────────────────

  describe("POST /api/auth/sign-up/email", () => {
    it("returns 200 and the created user on valid registration", async () => {
      const res = await request(app)
        .post("/api/auth/sign-up/email")
        .send(TEST_USER);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        email: TEST_USER.email,
        name: TEST_USER.name,
      });
    });

    it("does not expose the password hash in the response", async () => {
      const res = await request(app)
        .post("/api/auth/sign-up/email")
        .send(TEST_USER);

      expect(res.body.user?.password).toBeUndefined();
    });

    it("returns 422 when the email is already registered", async () => {
      await request(app).post("/api/auth/sign-up/email").send(TEST_USER);

      const res = await request(app)
        .post("/api/auth/sign-up/email")
        .send(TEST_USER);

      expect(res.status).toBe(422);
    });
  });

  // ── POST /api/auth/sign-in/email ─────────────────────────────────────────

  describe("POST /api/auth/sign-in/email", () => {
    // Register the test user once before each sign-in test
    beforeEach(async () => {
      await request(app).post("/api/auth/sign-up/email").send(TEST_USER);
    });

    it("returns 200 with user data on valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/sign-in/email")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(TEST_USER.email);
    });

    it("sets a session cookie on successful login", async () => {
      const res = await request(app)
        .post("/api/auth/sign-in/email")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const cookies = res.headers["set-cookie"] as string[];
      expect(cookies).toBeDefined();
      expect(
        cookies.some((c: string) => c.includes("better-auth.session_token"))
      ).toBe(true);
    });

    it("returns 401 when the password is incorrect", async () => {
      const res = await request(app)
        .post("/api/auth/sign-in/email")
        .send({ email: TEST_USER.email, password: "wrong-password" });

      expect(res.status).toBe(401);
    });

    it("returns 401 when the email does not exist", async () => {
      const res = await request(app)
        .post("/api/auth/sign-in/email")
        .send({ email: "nobody@example.com", password: "password123" });

      expect(res.status).toBe(401);
    });
  });
});
