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
  borrowedAt: now,
  dueDate: inOneWeek,
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
      // DB has camera1 and camera2 — user requests only camera1
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await LoanService.createLoan({ userId: "user-1", gearIds: ["camera-1"], dueDate: inOneWeek });

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
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await LoanService.createLoan({ userId: "user-1", gearIds: ["camera-1"], dueDate: inOneWeek });

      expect(prismaMock.loanItem.createMany).toHaveBeenCalledWith({
        data: [{ loanId: mockLoan.id, gearId: "camera-1", status: ItemStatus.ACTIVE }],
      });
    });

    it("updates only the requested gear's status to RENTED, not other available gear", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await LoanService.createLoan({ userId: "user-1", gearIds: ["camera-1"], dueDate: inOneWeek });

      expect(prismaMock.gear.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["camera-1"] } },
        data: { status: GearStatus.RENTED },
      });
    });

    it("returns the created loan", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      const result = await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1"],
        dueDate: inOneWeek,
      });

      expect(result).toEqual(mockLoan);
    });

    it("succeeds when gear is currently RENTED but existing loan ends before the new booking starts", async () => {
      setupTransaction();
      // Existing loan on camera-1 ends in 1 week, new booking starts in 2 weeks — no overlap
      prismaMock.loanItem.findMany.mockResolvedValue([]);
      prismaMock.gear.findMany.mockResolvedValue([{ ...camera1, status: GearStatus.RENTED }]);
      prismaMock.loan.create.mockResolvedValue({ ...mockLoan, dueDate: inThreeWeeks });
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 1 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        LoanService.createLoan({ userId: "user-1", gearIds: ["camera-1"], dueDate: inThreeWeeks })
      ).resolves.toBeDefined();
    });
  });

  // ── Multi-item loan ─────────────────────────────────────────────────────────

  describe("multi-item loan", () => {
    it("fetches only the specific requested gear IDs, not all gear", async () => {
      setupTransaction();
      setupNoOverlaps();
      // DB has camera1, camera2, lens1, lens2 — user requests only camera1 + lens1
      prismaMock.gear.findMany.mockResolvedValue([camera1, lens1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 2 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 2 });

      await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1", "lens-1"],
        dueDate: inOneWeek,
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
      prismaMock.gear.updateMany.mockResolvedValue({ count: 2 });

      await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1", "lens-1"],
        dueDate: inOneWeek,
      });

      expect(prismaMock.loanItem.createMany).toHaveBeenCalledWith({
        data: [
          { loanId: mockLoan.id, gearId: "camera-1", status: ItemStatus.ACTIVE },
          { loanId: mockLoan.id, gearId: "lens-1", status: ItemStatus.ACTIVE },
        ],
      });
    });

    it("updates only the requested gear IDs to RENTED, leaving camera2 and lens2 untouched", async () => {
      setupTransaction();
      setupNoOverlaps();
      prismaMock.gear.findMany.mockResolvedValue([camera1, lens1]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 2 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 2 });

      await LoanService.createLoan({
        userId: "user-1",
        gearIds: ["camera-1", "lens-1"],
        dueDate: inOneWeek,
      });

      expect(prismaMock.gear.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["camera-1", "lens-1"] } },
        data: { status: GearStatus.RENTED },
      });
    });

    it("throws ConflictError when one of the requested items has an overlapping booking", async () => {
      setupTransaction();
      // camera1 has a conflicting booking, lens1 is free
      prismaMock.loanItem.findMany.mockResolvedValue([conflictingLoanItem]);
      prismaMock.gear.findMany.mockResolvedValue([camera1, lens1]);

      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1", "lens-1"],
          dueDate: inOneWeek,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("succeeds when one item is RENTED but its loan ends before the new booking period", async () => {
      setupTransaction();
      // lens1 is currently RENTED but no date overlap with new booking
      prismaMock.loanItem.findMany.mockResolvedValue([]);
      prismaMock.gear.findMany.mockResolvedValue([
        camera1,
        { ...lens1, status: GearStatus.RENTED },
      ]);
      prismaMock.loan.create.mockResolvedValue(mockLoan);
      prismaMock.loanItem.createMany.mockResolvedValue({ count: 2 });
      prismaMock.gear.updateMany.mockResolvedValue({ count: 2 });

      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1", "lens-1"],
          dueDate: inTwoWeeks,
        })
      ).resolves.toBeDefined();
    });
  });

  // ── Validation errors ───────────────────────────────────────────────────────

  describe("validation", () => {
    it("throws ValidationError when gearIds array is empty", async () => {
      await expect(
        LoanService.createLoan({ userId: "user-1", gearIds: [], dueDate: inOneWeek })
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when dueDate is in the past", async () => {
      await expect(
        LoanService.createLoan({ userId: "user-1", gearIds: ["camera-1"], dueDate: yesterday })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── Availability / overlap errors ───────────────────────────────────────────

  describe("availability checks", () => {
    it("throws ConflictError when the requested gear has an overlapping active booking", async () => {
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loanItem.findMany.mockResolvedValue([conflictingLoanItem]);

      await expect(
        LoanService.createLoan({ userId: "user-1", gearIds: ["camera-1"], dueDate: inOneWeek })
      ).rejects.toThrow(ConflictError);
    });

    it("throws NotFoundError when a requested gear ID does not exist in the database", async () => {
      // findMany returns only camera1 but nonexistent-id was also requested
      prismaMock.gear.findMany.mockResolvedValue([camera1]);
      prismaMock.loanItem.findMany.mockResolvedValue([]);

      await expect(
        LoanService.createLoan({
          userId: "user-1",
          gearIds: ["camera-1", "nonexistent-id"],
          dueDate: inOneWeek,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
