import { Router } from "express";
import { UserController } from "./user.controller";
import { validate } from "../middleware/validate";
import { CreateUserSchema } from "./user.schema";

export const userRouter = Router();

userRouter.get("/", UserController.listUsers);
userRouter.get("/:id", UserController.getUserById);
userRouter.post("/", validate(CreateUserSchema), UserController.createUser);
