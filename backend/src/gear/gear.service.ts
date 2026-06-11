import prisma from "../lib/prisma";
import { Gear, ItemStatus, Prisma } from "../generated/prisma/client";
import { NotFoundError, ConflictError } from "../errors/AppError";
import { CreateGearInput, ListGearQuery } from "./gear.schema";

export const GearService = {
  async listGear({ startDate, dueDate }: ListGearQuery = {}): Promise<Gear[]> {
    if (!startDate || !dueDate) {
      return prisma.gear.findMany({
        where: { status: { notIn: ['MAINTENANCE', 'LOST'] } },
      });
    }

    const bookedItems = await prisma.loanItem.findMany({
      where: {
        status: { in: [ItemStatus.RESERVED, ItemStatus.ACTIVE, ItemStatus.OVERDUE] },
        loan: {
          startDate: { lt: dueDate },
          dueDate: { gt: startDate },
        },
      },
      select: { gearId: true },
    });

    const bookedGearIds = bookedItems.map((i) => i.gearId);

    return prisma.gear.findMany({
      where: {
        id: { notIn: bookedGearIds },
        status: { notIn: ['MAINTENANCE', 'LOST'] },
      },
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
    try {
      return await prisma.gear.create({ data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictError(`Gear with serialNumber ${data.serialNumber} already exists`);
      }
      throw err;
    }
  },
};
