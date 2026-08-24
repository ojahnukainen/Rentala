import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { apiDocsMode, basicAuth } from "./apiDocs";

// ─── apiDocsMode ──────────────────────────────────────────────────────────────

describe("apiDocsMode", () => {
  it("is off when nothing is configured", () => {
    expect(apiDocsMode({})).toBe("off");
  });

  // Deliberately independent of NODE_ENV: a deployed host that forgets to set
  // it must not end up publishing the API surface.
  it("stays off in production and in development when unconfigured", () => {
    expect(apiDocsMode({ NODE_ENV: "production" })).toBe("off");
    expect(apiDocsMode({ NODE_ENV: "development" })).toBe("off");
  });

  it("is protected when both credentials are set", () => {
    expect(apiDocsMode({ API_DOCS_USER: "docs", API_DOCS_PASSWORD: "s3cret" })).toBe(
      "protected"
    );
  });

  it("is public on explicit opt-in", () => {
    expect(apiDocsMode({ API_DOCS_PUBLIC: "true" })).toBe("public");
  });

  it("is off when only the user is set", () => {
    expect(apiDocsMode({ API_DOCS_USER: "docs" })).toBe("off");
  });

  it("is off when only the password is set", () => {
    expect(apiDocsMode({ API_DOCS_PASSWORD: "s3cret" })).toBe("off");
  });

  // Half-configured credentials must not silently downgrade to public.
  it("is off when credentials are half-configured even with the public opt-in", () => {
    expect(
      apiDocsMode({ API_DOCS_USER: "docs", API_DOCS_PUBLIC: "true" })
    ).toBe("off");
  });

  it("prefers protected over public when both are configured", () => {
    expect(
      apiDocsMode({
        API_DOCS_USER: "docs",
        API_DOCS_PASSWORD: "s3cret",
        API_DOCS_PUBLIC: "true",
      })
    ).toBe("protected");
  });

  it("treats any value other than \"true\" as no public opt-in", () => {
    expect(apiDocsMode({ API_DOCS_PUBLIC: "1" })).toBe("off");
    expect(apiDocsMode({ API_DOCS_PUBLIC: "yes" })).toBe("off");
  });
});

// ─── basicAuth ────────────────────────────────────────────────────────────────

describe("basicAuth", () => {
  const USER = "docs";
  const PASSWORD = "s3cret";

  function run(authorization?: string) {
    const req = { headers: authorization ? { authorization } : {} } as Request;
    const res = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    basicAuth(USER, PASSWORD)(req, res, next);

    return { res, next };
  }

  function encode(user: string, password: string): string {
    return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  }

  it("calls next() when the credentials match", () => {
    const { next, res } = run(encode(USER, PASSWORD));

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responds 401 with a WWW-Authenticate challenge when the header is missing", () => {
    const { next, res } = run();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.set).toHaveBeenCalledWith(
      "WWW-Authenticate",
      expect.stringContaining("Basic")
    );
  });

  it("responds 401 when the password is wrong", () => {
    const { next, res } = run(encode(USER, "wrong"));

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("responds 401 when the user is wrong", () => {
    const { next, res } = run(encode("wrong", PASSWORD));

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("responds 401 for a non-Basic scheme", () => {
    const { next, res } = run("Bearer some-token");

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("responds 401 when the decoded credentials have no colon separator", () => {
    const { next, res } = run(`Basic ${Buffer.from("nocolon").toString("base64")}`);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects a wrong colon-containing password rather than truncating it at the colon", () => {
    const { next, res } = run(encode(USER, "pass:with:colons"));

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("accepts a correct password that itself contains colons", () => {
    const req = {
      headers: { authorization: encode(USER, "a:b") },
    } as Request;
    const res = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    basicAuth(USER, "a:b")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  // A caller must not be able to tell which half of the credentials was wrong.
  it("responds identically for a wrong user and a wrong password", () => {
    const wrongUser = run(encode("wrong", PASSWORD));
    const wrongPassword = run(encode(USER, "wrong"));

    expect(vi.mocked(wrongUser.res.json).mock.calls).toEqual(
      vi.mocked(wrongPassword.res.json).mock.calls
    );
    expect(vi.mocked(wrongUser.res.status).mock.calls).toEqual(
      vi.mocked(wrongPassword.res.status).mock.calls
    );
  });
});
