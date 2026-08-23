import { Router } from "express";
import { GearController } from "./gear.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { CreateGearSchema } from "./gear.schema";

export const gearRouter = Router();

// The GET routes stay public: /gear has no route guard on the frontend and the
// checkout flow is what redirects to login, so members browse before signing in.
gearRouter.get("/", GearController.listGear);
gearRouter.get("/:id", GearController.getGearById);
gearRouter.post("/", requireAuth, validate(CreateGearSchema), GearController.createGear);
