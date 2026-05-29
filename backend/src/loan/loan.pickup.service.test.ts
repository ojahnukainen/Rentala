import { describe, it, expect } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { LoanService } from "./loan.service";
import { NotFoundError, ConflictError } from "../errors/AppError";
import { Loan, LoanItem, GearStatus, ItemStatus } from "../generated/prisma/client";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const now = new Date();
const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

const loanItem1: LoanItem = {
  id: "loan-item-1",
  loanId: "loan-1",
  gearId: "camera-1",
  status: ItemStatus.ACTIVE,
  returnedAt: null,
};

const loanItem2: LoanItem = {
  id: "loan-item-2",
  loanId: "loan-1",
  gearId: "lens-1",
  status: ItemStatus.ACTIVE,
  returnedAt: null,
};

const pendingLoan: Loan & { items: LoanItem[] } = {
  id: "loan-1",
  userId: "user-1",
  startDate: inOneWeek,
  borrowedAt: null,
  dueDate: inTwoWeeks,
  createdAt: now,
  updatedAt: now,
  items: [loanItem1, loanItem2],
};

const alreadyPickedUpLoan: Loan & { items: LoanItem[] } = {
  ...pendingLoan,
  borrowedAt: now,
};

function setupTransaction() {
  prismaMock.$transaction.mockImplementation(
    (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LoanService.pickupLoan", () => {

  describe("single-item pickup", () => {
    it("fetches the loan with its items by ID", async () => {
      setupTransaction();
      prismaMock.loan.findUnique.mockResolvedValue(pendingLoan as unknown as Loan);
      prismaMock.loan.update.mockResolvedValue({ ...pendingLoan, borrowedAt: now });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await LoanService.pickupLoan("loan-1", "user-1");

      expect(prismaMock.loan.findUnique).toHaveBeenCalledWith({
        where: { id: "loan-1" },
        include: { items: true },
      });
    });

    it("sets borrowedAt to the current timestamp inside a transaction", async () => {
      setupTransaction();
      prismaMock.loan.findUnique.mockResolvedValue(pendingLoan as unknown as Loan);
      prismaMock.loan.update.mockResolvedValue({ ...pendingLoan, borrowedAt: now });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await LoanService.pickupLoan("loan-1", "user-1");

      expect(prismaMock.loan.update).toHaveBeenCalledWith({
        where: { id: "loan-1" },
        data: { borrowedAt: expect.any(Date) },
      });
    });

    it("updates the loan's gear status to RENTED on pickup", async () => {
      setupTransaction();
      const singleItemLoan = { ...pendingLoan, items: [loanItem1] };
      prismaMock.loan.findUnique.mockResolvedValue(singleItemLoan as unknown as Loan);
      prismaMock.loan.update.mockResolvedValue({ ...singleItemLoan, borrowedAt: now });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await LoanService.pickupLoan("loan-1", "user-1");

      expect(prismaMock.gear.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["camera-1"] } },
        data: { status: GearStatus.RENTED },
      });
    });
  });

  describe("multi-item pickup", () => {
    it("updates all gear items in the loan to RENTED in a single call", async () => {
      setupTransaction();
      prismaMock.loan.findUnique.mockResolvedValue(pendingLoan as unknown as Loan);
      prismaMock.loan.update.mockResolvedValue({ ...pendingLoan, borrowedAt: now });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 2 });

      await LoanService.pickupLoan("loan-1", "user-1");

      expect(prismaMock.gear.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["camera-1", "lens-1"] } },
        data: { status: GearStatus.RENTED },
      });
    });

    it("returns the updated loan", async () => {
      setupTransaction();
      const updatedLoan = { ...pendingLoan, borrowedAt: now };
      prismaMock.loan.findUnique.mockResolvedValue(pendingLoan as unknown as Loan);
      prismaMock.loan.update.mockResolvedValue(updatedLoan);
      prismaMock.gear.updateMany.mockResolvedValue({ count: 2 });

      const result = await LoanService.pickupLoan("loan-1", "user-1");

      expect(result).toEqual(updatedLoan);
    });
  });

  describe("failure cases", () => {
    it("throws NotFoundError when the loan ID does not exist", async () => {
      prismaMock.loan.findUnique.mockResolvedValue(null);

      await expect(LoanService.pickupLoan("nonexistent-id", "user-1")).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when the loan belongs to a different user", async () => {
      prismaMock.loan.findUnique.mockResolvedValue(pendingLoan as unknown as Loan);

      await expect(LoanService.pickupLoan("loan-1", "other-user")).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when the loan has already been picked up", async () => {
      prismaMock.loan.findUnique.mockResolvedValue(
        alreadyPickedUpLoan as unknown as Loan
      );

      await expect(LoanService.pickupLoan("loan-1", "user-1")).rejects.toThrow(ConflictError);
    });
  });
});
