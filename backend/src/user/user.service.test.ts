import { describe, it, expect } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { UserService } from "./user.service";
import { NotFoundError } from "../errors/AppError";
import { User, Role } from "../generated/prisma/client";

const mockUser: User = {
  id: "user-1",
  email: "alice@cameraclub.fi",
  name: "Alice Virtanen",
  role: Role.MEMBER,
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UserService", () => {
  describe("listUsers", () => {
    it("returns all users from the database", async () => {
      prismaMock.user.findMany.mockResolvedValue([mockUser]);

      const result = await UserService.listUsers();

      expect(result).toEqual([mockUser]);
      expect(prismaMock.user.findMany).toHaveBeenCalledOnce();
    });

    it("returns an empty array when no users exist", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await UserService.listUsers();

      expect(result).toEqual([]);
    });
  });

  describe("getUserById", () => {
    it("returns the user when requesting your own record", async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.getUserById("user-1", "user-1");

      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });

    it("throws NotFoundError when your own record does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(UserService.getUserById("user-1", "user-1")).rejects.toThrow(NotFoundError);
    });

    // Members may read only their own record. A foreign id gets NotFound rather
    // than 403 so the response does not confirm whether that user exists.
    it("throws NotFoundError when requesting another user's record", async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(UserService.getUserById("user-2", "user-1")).rejects.toThrow(NotFoundError);
    });

    it("does not query the database when requesting another user's record", async () => {
      await expect(UserService.getUserById("user-2", "user-1")).rejects.toThrow(NotFoundError);

      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
