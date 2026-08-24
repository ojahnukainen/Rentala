import { createHash, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";

export type ApiDocsMode = "protected" | "public" | "off";

/**
 * Decides whether Swagger UI is mounted, and whether it is behind basic auth.
 *
 * Fails closed: docs are NOT served unless explicitly configured. This
 * deliberately does not key off NODE_ENV — a deployed host that forgets to set
 * it would otherwise publish the whole API surface, which is exactly the leak
 * this guard exists to prevent.
 *
 *   API_DOCS_USER + API_DOCS_PASSWORD  -> "protected"  (use this on staging)
 *   API_DOCS_PUBLIC="true"             -> "public"     (local development)
 *   neither                            -> "off"
 *
 * Half-configured credentials (only one of the two) resolve to "off" rather
 * than silently downgrading to public.
 */
export function apiDocsMode(env: NodeJS.ProcessEnv = process.env): ApiDocsMode {
  const user = env.API_DOCS_USER;
  const password = env.API_DOCS_PASSWORD;

  if (user && password) return "protected";
  if (user || password) return "off";
  if (env.API_DOCS_PUBLIC === "true") return "public";
  return "off";
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so the buffers are always the same length; timingSafeEqual
  // throws on a length mismatch, and the length itself would leak.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Minimal HTTP Basic auth. Rejects with an identical 401 for every failure
 * mode — missing header, malformed header, wrong user, wrong password — so the
 * response never reveals which half of the credentials was wrong.
 */
export function basicAuth(user: string, password: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;

    const reject = (): void => {
      res.set("WWW-Authenticate", 'Basic realm="API docs", charset="UTF-8"');
      res.status(401).json({
        error: { name: "Unauthorized", message: "Authentication required" },
      });
    };

    if (!header?.startsWith("Basic ")) return reject();

    let decoded: string;
    try {
      decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
    } catch {
      return reject();
    }

    const separator = decoded.indexOf(":");
    if (separator === -1) return reject();

    const suppliedUser = decoded.slice(0, separator);
    const suppliedPassword = decoded.slice(separator + 1);

    // Both comparisons always run, so the timing does not depend on which failed.
    const userOk = safeEqual(suppliedUser, user);
    const passwordOk = safeEqual(suppliedPassword, password);

    if (!userOk || !passwordOk) return reject();

    next();
  };
}
