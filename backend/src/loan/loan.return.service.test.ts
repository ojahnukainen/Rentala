import { describe, it, expect } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { LoanService } from "./loan.service";
import { NotFoundError, ConflictError } from "../errors/AppError";
import { LoanItem, ItemStatus, GearStatus } from "../generated/prisma/client";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const activeLoanItem1: LoanItem = {
  id: "loan-item-1",
  loanId: "loan-1",
  gearId: "camera-1",
  status: ItemStatus.ACTIVE,
  returnedAt: null,
};

const activeLoanItem2: LoanItem = {
  id: "loan-item-2",
  loanId: "loan-1",
  gearId: "lens-1",
  status: ItemStatus.ACTIVE,
  returnedAt: null,
};

const activeLoanItem3: LoanItem = {
  id: "loan-item-3",
  loanId: "loan-1",
  gearId: "lens-2",
  status: ItemStatus.ACTIVE,
  returnedAt: null,
};

const alreadyReturnedItem: LoanItem = {
  id: "loan-item-4",
  loanId: "loan-1",
  gearId: "camera-2",
  status: ItemStatus.RETURNED,
  returnedAt: new Date(),
};

function setupTransaction() {
  prismaMock.$transaction.mockImplementation(
    (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LoanService.processReturn", () => {

  // ── Single-item return ──────────────────────────────────────────────────────

  describe("single-item return", () => {
    it("fetches the LoanItem by the specific requested ID", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([activeLoanItem1]);
      prismaMock.loanItem.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await LoanService.processReturn(["loan-item-1"]);

      expect(prismaMock.loanItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["loan-item-1"] } },
      });
    });

    it("updates the LoanItem status to RETURNED and sets returnedAt inside a transaction", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([activeLoanItem1]);
      prismaMock.loanItem.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await LoanService.processReturn(["loan-item-1"]);

      expect(prismaMock.loanItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["loan-item-1"] } },
        data: { status: ItemStatus.RETURNED, returnedAt: expect.any(Date) },
      });
    });

    it("updates only the requested LoanItem's gear back to AVAILABLE, not other gear", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([activeLoanItem1]);
      prismaMock.loanItem.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await LoanService.processReturn(["loan-item-1"]);

      expect(prismaMock.gear.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["camera-1"] } },
        data: { status: GearStatus.AVAILABLE },
      });
    });
  });

  // ── Multi-item partial return ───────────────────────────────────────────────

  describe("multi-item partial return (subset of loan items)", () => {
    it("fetches only the specific requested LoanItem IDs", async () => {
      setupTransaction();
      // loan has 3 items; user returns only 2
      prismaMock.loanItem.findMany.mockResolvedValue([activeLoanItem1, activeLoanItem2]);
      prismaMock.loanItem.updateMany.mockResolvedValue({ count: 2 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 2 });

      await LoanService.processReturn(["loan-item-1", "loan-item-2"]);

      expect(prismaMock.loanItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["loan-item-1", "loan-item-2"] } },
      });
    });

    it("updates all requested LoanItems to RETURNED with returnedAt", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([activeLoanItem1, activeLoanItem2]);
      prismaMock.loanItem.updateMany.mockResolvedValue({ count: 2 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 2 });

      await LoanService.processReturn(["loan-item-1", "loan-item-2"]);

      expect(prismaMock.loanItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["loan-item-1", "loan-item-2"] } },
        data: { status: ItemStatus.RETURNED, returnedAt: expect.any(Date) },
      });
    });

    it("updates only the gear belonging to returned items to AVAILABLE, leaving item3's gear RENTED", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([activeLoanItem1, activeLoanItem2]);
      prismaMock.loanItem.updateMany.mockResolvedValue({ count: 2 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 2 });

      await LoanService.processReturn(["loan-item-1", "loan-item-2"]);

      expect(prismaMock.gear.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["camera-1", "lens-1"] } },
        data: { status: GearStatus.AVAILABLE },
      });
    });

    it("throws ConflictError when one of several items is already RETURNED", async () => {
      prismaMock.loanItem.findMany.mockResolvedValue([activeLoanItem1, alreadyReturnedItem]);

      await expect(
        LoanService.processReturn(["loan-item-1", "loan-item-4"])
      ).rejects.toThrow(ConflictError);
    });
  });

  // ── Full return (all items at once) ─────────────────────────────────────────

  describe("full return (all items of a loan at once)", () => {
    it("returns all loan items in a single call", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([
        activeLoanItem1,
        activeLoanItem2,
        activeLoanItem3,
      ]);
      prismaMock.loanItem.updateMany.mockResolvedValue({ count: 3 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 3 });

      await LoanService.processReturn(["loan-item-1", "loan-item-2", "loan-item-3"]);

      expect(prismaMock.loanItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["loan-item-1", "loan-item-2", "loan-item-3"] } },
        data: { status: ItemStatus.RETURNED, returnedAt: expect.any(Date) },
      });
    });

    it("sets all corresponding gear back to AVAILABLE in a single call", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([
        activeLoanItem1,
        activeLoanItem2,
        activeLoanItem3,
      ]);
      prismaMock.loanItem.updateMany.mockResolvedValue({ count: 3 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 3 });

      await LoanService.processReturn(["loan-item-1", "loan-item-2", "loan-item-3"]);

      expect(prismaMock.gear.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["camera-1", "lens-1", "lens-2"] } },
        data: { status: GearStatus.AVAILABLE },
      });
    });
  });

  // ── Failure cases ───────────────────────────────────────────────────────────

  describe("failure cases", () => {
    it("throws NotFoundError when the LoanItem ID does not exist", async () => {
      prismaMock.loanItem.findMany.mockResolvedValue([]);

      await expect(
        LoanService.processReturn(["nonexistent-id"])
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when one of several requested IDs does not exist", async () => {
      prismaMock.loanItem.findMany.mockResolvedValue([activeLoanItem1]);

      await expect(
        LoanService.processReturn(["loan-item-1", "nonexistent-id"])
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when the LoanItem is already RETURNED", async () => {
      prismaMock.loanItem.findMany.mockResolvedValue([alreadyReturnedItem]);

      await expect(
        LoanService.processReturn(["loan-item-4"])
      ).rejects.toThrow(ConflictError);
    });
  });
});
