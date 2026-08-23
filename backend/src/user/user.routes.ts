import { Router } from "express";
import { UserController } from "./user.controller";
import { requireAuth } from "../middleware/requireAuth";

export const userRouter = Router();

// All user routes require a session. `:id` routes are additionally restricted
// to the requesting user's own record — see UserService/LoanService.
// Signup is owned by better-auth at POST /api/auth/sign-up/email; there is no
// POST /users route.
userRouter.get("/", requireAuth, UserController.listUsers);
userRouter.get("/:id", requireAuth, UserController.getUserById);
userRouter.get("/:id/loans", requireAuth, UserController.getLoansByUser);
