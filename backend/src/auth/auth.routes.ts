import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth";

// Returns a Node-compatible handler that better-auth uses to process all
// /api/auth/* requests. Mount with app.all("/api/auth/*path", authHandler)
// BEFORE express.json() — better-auth reads the raw request body itself.
export const authHandler = toNodeHandler(auth);
