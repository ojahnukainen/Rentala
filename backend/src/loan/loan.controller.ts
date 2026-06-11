import { Request, Response, NextFunction } from "express";
import { LoanService } from "./loan.service";
import { CreateLoanInput, ProcessReturnInput } from "./loan.schema";

export const LoanController = {
  async createLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loan = await LoanService.createLoan({ ...req.body as CreateLoanInput, userId: req.user!.id });
      res.status(201).json(loan);
    } catch (err) {
      next(err);
    }
  },

  async pickupLoan(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const loan = await LoanService.pickupLoan(req.params.id, req.user!.id);
      res.json(loan);
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

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await LoanService.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },
};
