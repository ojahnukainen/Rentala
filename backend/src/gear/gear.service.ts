import prisma from "../lib/prisma";
import { Gear } from "../generated/prisma/client";
import { NotFoundError } from "../errors/AppError";
import { CreateGearInput } from "./gear.schema";

export const GearService = {
  async listGear(): Promise<Gear[]> {
    return prisma.gear.findMany();
  },

  async getGearById(id: string): Promise<Gear> {
    const gear = await prisma.gear.findUnique({ where: { id } });
    if (!gear) {
      throw new NotFoundError(`Gear with id ${id} not found`);
    }
    return gear;
  },

  async createGear(data: CreateGearInput): Promise<Gear> {
    return prisma.gear.create({ data });
  },
};
