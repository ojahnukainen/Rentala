import { Request, Response, NextFunction } from "express";
import { GearService } from "./gear.service";
import { CreateGearInput } from "./gear.schema";

export const GearController = {
  async listGear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gear = await GearService.listGear();
      res.json(gear);
    } catch (err) {
      next(err);
    }
  },

  async getGearById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const gear = await GearService.getGearById(req.params.id);
      res.json(gear);
    } catch (err) {
      next(err);
    }
  },

  async createGear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gear = await GearService.createGear(req.body as CreateGearInput);
      res.status(201).json(gear);
    } catch (err) {
      next(err);
    }
  },
};
