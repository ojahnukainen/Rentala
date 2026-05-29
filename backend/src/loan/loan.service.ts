import prisma from "../lib/prisma";
import { Loan, LoanItem, Gear, ItemStatus, GearStatus } from "../generated/prisma/client";
import { ValidationError, ConflictError, NotFoundError } from "../errors/AppError";
import { CreateLoanInput } from "./loan.schema";

// userId comes from the authenticated session, not the request body
type CreateLoanServiceInput = CreateLoanInput & { userId: string };
type LoanWithItems = Loan & { items: LoanItem[] };
type LoanWithItemsAndGear = Loan & { items: (LoanItem & { gear: Gear })[] };
type ReturnResult = { count: number };

export const LoanService = {
  async createLoan(data: CreateLoanServiceInput): Promise<Loan> {
    const { userId, gearIds, startDate, dueDate } = data;

    if (gearIds.length === 0) {
      throw new ValidationError("At least one gear item is required");
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (startDate < startOfToday) {
      throw new ValidationError("Start date cannot be in the past");
    }

    if (dueDate <= startDate) {
      throw new ValidationError("Due date must be after start date");
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
          startDate: { lt: dueDate },
          dueDate: { gt: startDate },
        },
      },
    });

    if (overlappingItems.length > 0) {
      throw new ConflictError(
        "One or more gear items are not available for the requested period"
      );
    }

    // Gear stays AVAILABLE — status is updated to RENTED only at pickup
    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: { userId, startDate, dueDate },
      });

      await tx.loanItem.createMany({
        data: gearIds.map((gearId) => ({
          loanId: loan.id,
          gearId,
          status: ItemStatus.ACTIVE,
        })),
      });

      return loan;
    });
  },

  async pickupLoan(loanId: string, requestingUserId: string): Promise<Loan> {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { items: true },
    }) as LoanWithItems | null;

    if (!loan) {
      throw new NotFoundError(`Loan with id ${loanId} not found`);
    }

    if (loan.userId !== requestingUserId) {
      throw new NotFoundError(`Loan with id ${loanId} not found`);
    }

    if (loan.borrowedAt !== null) {
      throw new ConflictError(`Loan ${loanId} has already been picked up`);
    }

    const gearIds = loan.items.map((item) => item.gearId);

    return prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: { borrowedAt: new Date() },
      });

      await tx.gear.updateMany({
        where: { id: { in: gearIds } },
        data: { status: GearStatus.RENTED },
      });

      return updatedLoan;
    });
  },

  async getLoansByUser(userId: string): Promise<LoanWithItemsAndGear[]> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }

    return prisma.loan.findMany({
      where: { userId },
      include: { items: { include: { gear: true } } },
    });
  },

  async processReturn(loanItemIds: string[]): Promise<ReturnResult> {
    const items = await prisma.loanItem.findMany({
      where: { id: { in: loanItemIds } },
    });

    if (items.length !== loanItemIds.length) {
      const foundIds = new Set(items.map((i) => i.id));
      const missingId = loanItemIds.find((id) => !foundIds.has(id));
      throw new NotFoundError(`LoanItem with id ${missingId} not found`);
    }

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
