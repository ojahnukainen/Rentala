import { describe, it, expect } from "vitest";
import {
  rateLimitEnabled,
  AUTH_RATE_LIMIT_RULES,
  AUTH_RATE_LIMIT_DEFAULTS,
} from "./rateLimit";

describe("rateLimitEnabled", () => {
  // better-auth's own default is NODE_ENV === "production", which would leave a
  // host that does not set NODE_ENV silently unprotected. We default to on.
  it("is on by default when nothing is configured", () => {
    expect(rateLimitEnabled({})).toBe(true);
  });

  it("is on in production", () => {
    expect(rateLimitEnabled({ NODE_ENV: "production" })).toBe(true);
  });

  it("is on in development", () => {
    expect(rateLimitEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  // The suite shares one client IP, so an enabled limiter would trip mid-run.
  it("is off under test", () => {
    expect(rateLimitEnabled({ NODE_ENV: "test" })).toBe(false);
  });

  it("can be forced on even under test", () => {
    expect(rateLimitEnabled({ NODE_ENV: "test", RATE_LIMIT_ENABLED: "true" })).toBe(true);
  });

  it("can be forced off in production", () => {
    expect(
      rateLimitEnabled({ NODE_ENV: "production", RATE_LIMIT_ENABLED: "false" })
    ).toBe(false);
  });

  it("ignores an unrecognised RATE_LIMIT_ENABLED value and falls back to the default", () => {
    expect(rateLimitEnabled({ RATE_LIMIT_ENABLED: "yes" })).toBe(true);
    expect(rateLimitEnabled({ NODE_ENV: "test", RATE_LIMIT_ENABLED: "yes" })).toBe(false);
  });
});

describe("AUTH_RATE_LIMIT_RULES", () => {
  it("caps sign-in attempts at 5 per minute", () => {
    expect(AUTH_RATE_LIMIT_RULES["/sign-in/email"]).toEqual({ window: 60, max: 5 });
  });

  it("keeps every credential-guessing route at 5 or fewer attempts per window", () => {
    for (const [path, rule] of Object.entries(AUTH_RATE_LIMIT_RULES)) {
      expect(rule.max, `${path} allows too many attempts`).toBeLessThanOrEqual(5);
      expect(rule.window, `${path} window is too short`).toBeGreaterThanOrEqual(60);
    }
  });

  it("keeps the global auth fallback below one request per second", () => {
    const perSecond = AUTH_RATE_LIMIT_DEFAULTS.max / AUTH_RATE_LIMIT_DEFAULTS.window;
    expect(perSecond).toBeLessThanOrEqual(1);
  });
});
