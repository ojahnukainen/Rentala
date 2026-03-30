import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service";
import { LoanService } from "../loan/loan.service";
import { CreateUserInput } from "./user.schema";

export const UserController = {
  async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UserService.listUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async getLoansByUser(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const loans = await LoanService.getLoansByUser(req.params.id);
      res.json(loans);
    } catch (err) {
      next(err);
    }
  },

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.createUser(req.body as CreateUserInput);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },
};
