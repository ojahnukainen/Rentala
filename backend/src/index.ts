import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi/document";
import { errorHandler } from "./middleware/errorHandler";
import { apiDocsMode, basicAuth } from "./middleware/apiDocs";
import { rateLimitEnabled } from "./lib/rateLimit";
import { authHandler } from "./auth/auth.routes";
import { gearRouter } from "./gear/gear.routes";
import { userRouter } from "./user/user.routes";
import { loanRouter } from "./loan/loan.routes";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Auth handler must come before express.json()
app.all("/api/auth/*path", authHandler);

app.use(express.json());

app.get("/ping", (_req, res) => {
  res.json({ status: "ok" });
});

// Swagger UI publishes the whole API surface, so it is mounted only when
// explicitly configured. Unconfigured means not mounted at all — see
// src/middleware/apiDocs.ts.
const docsMode = apiDocsMode();
const docsUser = process.env.API_DOCS_USER;
const docsPassword = process.env.API_DOCS_PASSWORD;

if (docsMode === "protected" && docsUser && docsPassword) {
  app.use(
    "/api-docs",
    basicAuth(docsUser, docsPassword),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument)
  );
} else if (docsMode === "public") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}

app.use("/api/v1/gear", gearRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/loans", loanRouter);

app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API docs: ${docsMode}`);
    console.log(`Auth rate limiting: ${rateLimitEnabled() ? "on" : "off"}`);
  });
}

export { app };
