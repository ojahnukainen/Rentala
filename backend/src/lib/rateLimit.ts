/**
 * Rate-limit configuration for the better-auth handler (`/api/auth/*`).
 *
 * better-auth defaults `rateLimit.enabled` to `NODE_ENV === "production"`. We do
 * not rely on that: a host that does not set NODE_ENV would leave sign-in brute
 * force completely unbounded while the config still *looks* enabled. Instead we
 * default to on everywhere and switch off only under test, where the whole suite
 * shares one client IP and would trip the limiter.
 *
 * Note: limits are per-IP and better-auth reads the client IP from the
 * `x-forwarded-for` header. Behind a proxy that does not set it, better-auth
 * skips rate limiting rather than failing closed — see `getIp` in
 * better-auth/dist/utils/get-request-ip.mjs.
 *
 * Storage is in-memory, so limits are per process. That is fine for a
 * single-instance pilot; multiple instances would each get their own budget.
 */

export function rateLimitEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.RATE_LIMIT_ENABLED === "true") return true;
  if (env.RATE_LIMIT_ENABLED === "false") return false;
  return env.NODE_ENV !== "test";
}

/**
 * Per-path overrides, keyed by path relative to the auth base path.
 *
 * better-auth already applies a built-in rule of 3 requests / 10s to anything
 * under /sign-in, /sign-up, /change-password and /change-email. These rules
 * layer a longer window on top so an attacker cannot simply pace their guesses
 * to just under the 10-second bucket.
 */
export const AUTH_RATE_LIMIT_RULES = {
  "/sign-in/email": { window: 60, max: 5 },
  "/sign-up/email": { window: 3600, max: 5 },
  "/forget-password": { window: 3600, max: 5 },
  "/reset-password": { window: 3600, max: 5 },
} as const;

/** Global fallback for auth routes with no specific rule. */
export const AUTH_RATE_LIMIT_DEFAULTS = { window: 60, max: 60 } as const;
