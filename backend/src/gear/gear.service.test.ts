import { describe, it, expect } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { GearService } from "./gear.service";
import { NotFoundError, ConflictError } from "../errors/AppError";
import { Gear, GearClassification, GearStatus, Prisma } from "../generated/prisma/client";

const mockGear: Gear = {
  id: "gear-1",
  name: "Sony A7 IV",
  serialNumber: "SN-BODY-001",
  category: "Camera Body",
  status: GearStatus.AVAILABLE,
  classification: GearClassification.EVENT,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GearService", () => {
  describe("listGear", () => {
    it("returns all gear from the database", async () => {
      prismaMock.gear.findMany.mockResolvedValue([mockGear]);

      const result = await GearService.listGear();

      expect(result).toEqual([mockGear]);
      expect(prismaMock.gear.findMany).toHaveBeenCalledOnce();
    });

    it("returns an empty array when no gear exists", async () => {
      prismaMock.gear.findMany.mockResolvedValue([]);

      const result = await GearService.listGear();

      expect(result).toEqual([]);
    });
  });

  describe("getGearById", () => {
    it("returns the gear item when found", async () => {
      prismaMock.gear.findUnique.mockResolvedValue(mockGear);

      const result = await GearService.getGearById("gear-1");

      expect(result).toEqual(mockGear);
      expect(prismaMock.gear.findUnique).toHaveBeenCalledWith({
        where: { id: "gear-1" },
      });
    });

    it("throws NotFoundError when gear does not exist", async () => {
      prismaMock.gear.findUnique.mockResolvedValue(null);

      await expect(GearService.getGearById("missing-id")).rejects.toThrow(NotFoundError);
    });
  });

  describe("createGear", () => {
    const baseInput = {
      name: "Sony A7 IV",
      serialNumber: "SN-BODY-001",
      category: "Camera Body",
      classification: GearClassification.EVENT,
    };

    it("creates and returns the new gear item", async () => {
      prismaMock.gear.create.mockResolvedValue(mockGear);

      const result = await GearService.createGear(baseInput);

      expect(result).toEqual(mockGear);
    });

    it("calls prisma.gear.create with the full data payload including classification", async () => {
      prismaMock.gear.create.mockResolvedValue(mockGear);

      await GearService.createGear(baseInput);

      expect(prismaMock.gear.create).toHaveBeenCalledWith({ data: baseInput });
    });

    it("throws ConflictError when prisma rejects with P2002 (duplicate serial number)", async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "0",
      });
      prismaMock.gear.create.mockRejectedValue(p2002);

      await expect(GearService.createGear(baseInput)).rejects.toThrow(ConflictError);
    });

    it("rethrows non-P2002 errors unchanged", async () => {
      const otherErr = new Error("boom");
      prismaMock.gear.create.mockRejectedValue(otherErr);

      await expect(GearService.createGear(baseInput)).rejects.toThrow("boom");
    });
  });
});
