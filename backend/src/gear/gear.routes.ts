import { Router } from "express";
import { GearController } from "./gear.controller";
import { validate } from "../middleware/validate";
import { CreateGearSchema } from "./gear.schema";

export const gearRouter = Router();

gearRouter.get("/", GearController.listGear);
gearRouter.get("/:id", GearController.getGearById);
gearRouter.post("/", validate(CreateGearSchema), GearController.createGear);
