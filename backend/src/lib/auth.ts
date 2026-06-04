import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3000",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    useSecureCookies: process.env.SECURE_COOKIES === "true",
    defaultCookieAttributes:
      process.env.SECURE_COOKIES === "true"
        ? { sameSite: "none", secure: true }
        : undefined,
  },
});
