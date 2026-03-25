import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { gearRouter } from "./gear/gear.routes";
import { userRouter } from "./user/user.routes";
import { loanRouter } from "./loan/loan.routes";

const app = express();

app.use(express.json());

app.get("/ping", (_req, res) => {
  res.json({ status: "ok" });
});

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
