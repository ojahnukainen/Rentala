import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi/document";
import { errorHandler } from "./middleware/errorHandler";
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

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/api/v1/gear", gearRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/loans", loanRouter);

app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
