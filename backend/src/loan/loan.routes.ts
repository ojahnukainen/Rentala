import { Router } from "express";
import { LoanController } from "./loan.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { CreateLoanSchema, ProcessReturnSchema } from "./loan.schema";

export const loanRouter = Router();

loanRouter.post("/", requireAuth, validate(CreateLoanSchema), LoanController.createLoan);
loanRouter.post("/:id/pickup", requireAuth, LoanController.pickupLoan);
loanRouter.post("/returns", requireAuth, validate(ProcessReturnSchema), LoanController.processReturn);
loanRouter.get("/stats", requireAuth, LoanController.getStats);
