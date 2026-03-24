import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { gearRouter } from "./gear/gear.routes";

const app = express();

app.use(express.json());

app.get("/ping", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/gear", gearRouter);

app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
