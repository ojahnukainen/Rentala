import prisma from "../lib/prisma";
import { Loan, ItemStatus, GearStatus } from "../generated/prisma/client";
import { ValidationError, ConflictError, NotFoundError } from "../errors/AppError";
import { CreateLoanInput } from "./loan.schema";

type ReturnResult = { count: number };

export const LoanService = {
  async createLoan(data: CreateLoanInput): Promise<Loan> {
    const { userId, gearIds, dueDate } = data;

    if (gearIds.length === 0) {
      throw new ValidationError("At least one gear item is required");
    }

    if (dueDate <= new Date()) {
      throw new ValidationError("Due date must be in the future");
    }

    // Verify all requested gear IDs exist
    const gear = await prisma.gear.findMany({
      where: { id: { in: gearIds } },
    });

    if (gear.length !== gearIds.length) {
      const foundIds = new Set(gear.map((g) => g.id));
      const missingId = gearIds.find((id) => !foundIds.has(id));
      throw new NotFoundError(`Gear with id ${missingId} not found`);
    }

    // Check for date-range overlaps on the requested gear
    const overlappingItems = await prisma.loanItem.findMany({
      where: {
        gearId: { in: gearIds },
        status: { in: [ItemStatus.ACTIVE, ItemStatus.OVERDUE] },
        loan: {
          borrowedAt: { lt: dueDate },
          dueDate: { gt: new Date() },
        },
      },
    });

    if (overlappingItems.length > 0) {
      throw new ConflictError(
        "One or more gear items are not available for the requested period"
      );
    }

    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: { userId, dueDate },
      });

      await tx.loanItem.createMany({
        data: gearIds.map((gearId) => ({
          loanId: loan.id,
          gearId,
          status: ItemStatus.ACTIVE,
        })),
      });

      await tx.gear.updateMany({
        where: { id: { in: gearIds } },
        data: { status: GearStatus.RENTED },
      });

      return loan;
    });
  },

  async processReturn(loanItemIds: string[]): Promise<ReturnResult> {
    // Fetch the requested loan items
    const items = await prisma.loanItem.findMany({
      where: { id: { in: loanItemIds } },
    });

    // Verify all requested IDs exist
    if (items.length !== loanItemIds.length) {
      const foundIds = new Set(items.map((i) => i.id));
      const missingId = loanItemIds.find((id) => !foundIds.has(id));
      throw new NotFoundError(`LoanItem with id ${missingId} not found`);
    }

    // Prevent double-returning
    const alreadyReturned = items.filter((i) => i.status === ItemStatus.RETURNED);
    if (alreadyReturned.length > 0) {
      throw new ConflictError(
        `LoanItem ${alreadyReturned[0].id} has already been returned`
      );
    }

    const gearIds = items.map((i) => i.gearId);
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      await tx.loanItem.updateMany({
        where: { id: { in: loanItemIds } },
        data: { status: ItemStatus.RETURNED, returnedAt: now },
      });

      await tx.gear.updateMany({
        where: { id: { in: gearIds } },
        data: { status: GearStatus.AVAILABLE },
      });

      return { count: loanItemIds.length };
    });
  },
};
