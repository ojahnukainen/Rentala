import { describe, it, expect } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { LoanService } from "./loan.service";
import { NotFoundError } from "../errors/AppError";
import {
  Gear,
  GearStatus,
  ItemStatus,
  Loan,
  LoanItem,
  User,
  Role,
} from "../generated/prisma/client";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const now = new Date();
const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
const inThreeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

const user1: User = {
  id: "user-1",
  email: "alice@cameraclub.fi",
  name: "Alice Virtanen",
  role: Role.ADMIN,
  createdAt: now,
  updatedAt: now,
};

const camera1: Gear = {
  id: "camera-1",
  name: "Sony A7 IV",
  serialNumber: "SN-BODY-001",
  category: "Camera Body",
  status: GearStatus.RENTED,
  createdAt: now,
  updatedAt: now,
};

const lens1: Gear = {
  id: "lens-1",
  name: "Sony FE 50mm f/1.8",
  serialNumber: "SN-LENS-001",
  category: "Lens",
  status: GearStatus.RENTED,
  createdAt: now,
  updatedAt: now,
};

const loanItem1: LoanItem & { gear: Gear } = {
  id: "loan-item-1",
  loanId: "loan-1",
  gearId: "camera-1",
  status: ItemStatus.ACTIVE,
  returnedAt: null,
  gear: camera1,
};

const loanItem2: LoanItem & { gear: Gear } = {
  id: "loan-item-2",
  loanId: "loan-2",
  gearId: "lens-1",
  status: ItemStatus.ACTIVE,
  returnedAt: null,
  gear: lens1,
};

const loan1: Loan & { items: (LoanItem & { gear: Gear })[] } = {
  id: "loan-1",
  userId: "user-1",
  startDate: inOneWeek,
  borrowedAt: null,
  dueDate: inTwoWeeks,
  createdAt: now,
  updatedAt: now,
  items: [loanItem1],
};

const loan2: Loan & { items: (LoanItem & { gear: Gear })[] } = {
  id: "loan-2",
  userId: "user-1",
  startDate: inTwoWeeks,
  borrowedAt: null,
  dueDate: inThreeWeeks,
  createdAt: now,
  updatedAt: now,
  items: [loanItem2],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LoanService.getLoansByUser", () => {

  describe("fetching loans", () => {
    it("checks the user exists before querying loans", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user1);
      prismaMock.loan.findMany.mockResolvedValue([loan1] as unknown as Loan[]);

      await LoanService.getLoansByUser("user-1");

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });

    it("queries loans filtered by the given userId", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user1);
      prismaMock.loan.findMany.mockResolvedValue([loan1] as unknown as Loan[]);

      await LoanService.getLoansByUser("user-1");

      expect(prismaMock.loan.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        include: { items: { include: { gear: true } } },
      });
    });

    it("includes items and their gear details in the response", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user1);
      prismaMock.loan.findMany.mockResolvedValue([loan1] as unknown as Loan[]);

      const result = await LoanService.getLoansByUser("user-1");

      expect(result).toEqual([loan1]);
    });

    it("returns all loans for the user when they have multiple", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user1);
      prismaMock.loan.findMany.mockResolvedValue([loan1, loan2] as unknown as Loan[]);

      const result = await LoanService.getLoansByUser("user-1");

      expect(result).toHaveLength(2);
    });

    it("returns an empty array when the user has no loans", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user1);
      prismaMock.loan.findMany.mockResolvedValue([]);

      const result = await LoanService.getLoansByUser("user-1");

      expect(result).toEqual([]);
    });
  });

  describe("failure cases", () => {
    it("throws NotFoundError when the user ID does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        LoanService.getLoansByUser("nonexistent-id")
      ).rejects.toThrow(NotFoundError);
    });
  });
});
