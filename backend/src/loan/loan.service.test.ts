import { describe, it, expect } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { LoanService } from "./loan.service";
import { ValidationError, ConflictError, NotFoundError } from "../errors/AppError";
import {
  Gear,
  GearStatus,
  Loan,
  LoanItem,
  ItemStatus,
} from "../generated/prisma/client";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const camera1: Gear = {
  id: "camera-1",
  name: "Sony A7 IV",
  serialNumber: "SN-BODY-001",
  category: "Camera Body",
  status: GearStatus.AVAILABLE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const lens1: Gear = {
  id: "lens-1",
  name: "Sony FE 50mm f/1.8",
  serialNumber: "SN-LENS-001",
  category: "Lens",
  status: GearStatus.AVAILABLE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const now = new Date();
const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
const inThreeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const mockLoan: Loan = {
  id: "loan-1",
  userId: "user-1",
  startDate: inOneWeek,
  borrowedAt: null,
  dueDate: inTwoWeeks,
  createdAt: now,
  updatedAt: now,
};

// A conflicting LoanItem: camera-1 is already booked during the requested period
const conflictingLoanItem: LoanItem = {
  id: "loan-item-1",
  loanId: "loan-existing",
  gearId: "camera-1",
  status: ItemStatus.ACTIVE,
  returnedAt: null,
};

function setupTransaction() {
  prismaMock.$transaction.mockImplementation(
    (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
}

function setupNoOverlaps() {
  prismaMock.loanItem.findMany.mockResolvedValue([]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LoanService.createLoan", () => {

  // ── Single-item loan ────────────────────────────────────────────────────────

  describe("single-item loan", () => {
    it("fetches only the specific requested gear ID, not all gear", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });

      await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1"],
        startDate: inOneWeek,
        dueDate: inTwoWeeks,
      });

      expect(prismaMock.gear.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["camera-1"] } },
      });
    });

    it("creates exactly one LoanItem for the requested gear", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });

      await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1"],
        startDate: inOneWeek,
        dueDate: inTwoWeeks,
      });

      expect(prismaMock.loanItem.createMany).toHaveBeenCalledWith({
        data: [{ loanId: mockLoan.id, gearId: "camera-1", status: ItemStatus.RESERVED }],
      });
    });

    it("does NOT update gear status at booking time — gear stays AVAILABLE until pickup", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });

      await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1"],
        startDate: inOneWeek,
        dueDate: inTwoWeeks,
      });

      expect(prismaMock.gear.updateMany).not.toHaveBeenCalled();
    });

    it("returns the created loan", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });

      const result = await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1"],
        startDate: inOneWeek,
        dueDate: inTwoWeeks,
      });

      expect(result).toEqual(mockLoan);
    });

    it("succeeds when gear is currently RENTED but existing loan ends before the new startDate", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([]);
      prismaMock.gear.findMany.mockResolvedValue([{ ...camera1, status: GearStatus.RENTED }]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });

      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1"],
          startDate: inTwoWeeks,
          dueDate: inThreeWeeks,
        })
      ).resolves.toBeDefined();
    });
  });

  // ── Multi-item loan ─────────────────────────────────────────────────────────

  describe("multi-item loan", () => {
    it("fetches only the specific requested gear IDs, not all gear", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1, lens1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 2 });

      await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1", "lens-1"],
        startDate: inOneWeek,
        dueDate: inTwoWeeks,
      });

      expect(prismaMock.gear.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["camera-1", "lens-1"] } },
      });
    });

    it("creates a LoanItem for each requested gear, not for others", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1, lens1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 2 });

      await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1", "lens-1"],
        startDate: inOneWeek,
        dueDate: inTwoWeeks,
      });

      expect(prismaMock.loanItem.createMany).toHaveBeenCalledWith({
        data: [
          { loanId: mockLoan.id, gearId: "camera-1", status: ItemStatus.RESERVED },
          { loanId: mockLoan.id, gearId: "lens-1", status: ItemStatus.RESERVED },
        ],
      });
    });

    it("does NOT update gear status at booking time for any of the items", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1, lens1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 2 });

      await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1", "lens-1"],
        startDate: inOneWeek,
        dueDate: inTwoWeeks,
      });

      expect(prismaMock.gear.updateMany).not.toHaveBeenCalled();
    });

    it("throws ConflictError when one of the requested items has an overlapping booking", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([conflictingLoanItem]);
      prismaMock.gear.findMany.mockResolvedValue([camera1, lens1]);

      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1", "lens-1"],
          startDate: inOneWeek,
          dueDate: inTwoWeeks,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("succeeds when one item is RENTED but its loan ends before the new startDate", async () => {
      setupTransaction();
      prismaMock.loanItem.findMany.mockResolvedValue([]);
      prismaMock.gear.findMany.mockResolvedValue([
        camera1,
        { ...lens1, status: GearStatus.RENTED },
      ]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 2 });

      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1", "lens-1"],
          startDate: inTwoWeeks,
          dueDate: inThreeWeeks,
        })
      ).resolves.toBeDefined();
    });
  });

  // ── Validation errors ───────────────────────────────────────────────────────

  describe("validation", () => {
    it("throws ValidationError when gearIds array is empty", async () => {
      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: [],
          startDate: inOneWeek,
          dueDate: inTwoWeeks,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when startDate is in the past", async () => {
      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1"],
          startDate: yesterday,
          dueDate: inOneWeek,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when dueDate is not after startDate", async () => {
      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1"],
          startDate: inTwoWeeks,
          dueDate: inOneWeek,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── Availability / overlap errors ───────────────────────────────────────────

  describe("availability checks", () => {
    it("throws ConflictError when the requested gear has an overlapping active booking", async () => {
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loanItem.findMany.mockResolvedValue([conflictingLoanItem]);

      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1"],
          startDate: inOneWeek,
          dueDate: inTwoWeeks,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("throws NotFoundError when a requested gear ID does not exist in the database", async () => {
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loanItem.findMany.mockResolvedValue([]);

      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1", "nonexistent-id"],
          startDate: inOneWeek,
          dueDate: inTwoWeeks,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});

describe("LoanService.getStats", () => {
  it("returns the count of loans that are not fully returned", async () => {
    prismaMock.loan.count.mockResolvedValue(7);

    const result = await LoanService.getStats();

    expect(result).toEqual({ activeLoans: 7 });
    expect(prismaMock.loan.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { items: { none: {} } },
          { items: { some: { NOT: { status: ItemStatus.RETURNED } } } },
        ],
      },
    });
  });

  it("returns zero when there are no active loans", async () => {
    prismaMock.loan.count.mockResolvedValue(0);

    const result = await LoanService.getStats();

    expect(result).toEqual({ activeLoans: 0 });
  });
});
