import { Request, Response, NextFunction } from "express";
import { LoanService } from "./loan.service";
import { CreateLoanInput, ProcessReturnInput } from "./loan.schema";

export const LoanController = {
  async createLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loan = await LoanService.createLoan(req.body as CreateLoanInput);
      res.status(201).json(loan);
    } catch (err) {
      next(err);
    }
  },

  async processReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loanItemIds } = req.body as ProcessReturnInput;
      const result = await LoanService.processReturn(loanItemIds);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
