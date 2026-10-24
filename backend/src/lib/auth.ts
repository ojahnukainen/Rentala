import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import {
  rateLimitEnabled,
  AUTH_RATE_LIMIT_RULES,
  AUTH_RATE_LIMIT_DEFAULTS,
} from "./rateLimit";

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
  // Declaring role here is what puts it on session.user — the column alone is
  // not enough. input: false stops sign-up from accepting a role in the body;
  // without it anyone could register as ADMIN. Promote via promote-admin.
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "MEMBER",
        input: false,
      },
    },
  },
  // Applies to /api/auth/* only; the /api/v1/* routes are not rate limited.
  // See src/lib/rateLimit.ts for why `enabled` does not follow NODE_ENV.
  rateLimit: {
    enabled: rateLimitEnabled(),
    window: AUTH_RATE_LIMIT_DEFAULTS.window,
    max: AUTH_RATE_LIMIT_DEFAULTS.max,
    customRules: AUTH_RATE_LIMIT_RULES,
  },
  advanced: {
    useSecureCookies: process.env.SECURE_COOKIES === "true",
    defaultCookieAttributes:
      process.env.SECURE_COOKIES === "true"
        ? { sameSite: "none", secure: true }
        : undefined,
  },
});
