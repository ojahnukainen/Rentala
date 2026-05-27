import prisma from "../lib/prisma";
import { Gear, ItemStatus } from "../generated/prisma/client";
import { NotFoundError } from "../errors/AppError";
import { CreateGearInput, ListGearQuery } from "./gear.schema";

export const GearService = {
  async listGear({ startDate, dueDate }: ListGearQuery = {}): Promise<Gear[]> {
    if (!startDate || !dueDate) {
      return prisma.gear.findMany();
    }

    const bookedItems = await prisma.loanItem.findMany({
      where: {
        status: { in: [ItemStatus.ACTIVE, ItemStatus.OVERDUE] },
        loan: {
          startDate: { lt: dueDate },
          dueDate: { gt: startDate },
        },
      },
      select: { gearId: true },
    });

    const bookedGearIds = bookedItems.map((i) => i.gearId);

    return prisma.gear.findMany({
      where: { id: { notIn: bookedGearIds } },
    });
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
