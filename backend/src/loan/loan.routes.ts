import { Router } from "express";
import { LoanController } from "./loan.controller";
import { validate } from "../middleware/validate";
import { CreateLoanSchema, ProcessReturnSchema } from "./loan.schema";

export const loanRouter = Router();

loanRouter.post("/", validate(CreateLoanSchema), LoanController.createLoan);
loanRouter.post("/:id/pickup", LoanController.pickupLoan);
loanRouter.post("/returns", validate(ProcessReturnSchema), LoanController.processReturn);
