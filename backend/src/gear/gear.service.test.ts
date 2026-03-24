import { describe, it, expect } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { GearService } from "./gear.service";
import { NotFoundError } from "../errors/AppError";
import { Gear, GearStatus } from "../generated/prisma/client";

const mockGear: Gear = {
  id: "gear-1",
  name: "Sony A7 IV",
  serialNumber: "SN-BODY-001",
  category: "Camera Body",
  status: GearStatus.AVAILABLE,
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
    it("creates and returns the new gear item", async () => {
      prismaMock.gear.create.mockResolvedValue(mockGear);

      const input = {
        name: "Sony A7 IV",
        serialNumber: "SN-BODY-001",
        category: "Camera Body",
      };

      const result = await GearService.createGear(input);

      expect(result).toEqual(mockGear);
    });

    it("calls prisma.gear.create with the correct data payload", async () => {
      prismaMock.gear.create.mockResolvedValue(mockGear);

      const input = {
        name: "Sony A7 IV",
        serialNumber: "SN-BODY-001",
        category: "Camera Body",
      };

      await GearService.createGear(input);

      expect(prismaMock.gear.create).toHaveBeenCalledWith({ data: input });
    });
  });
});
