import { describe, it, expect } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { UserService } from "./user.service";
import { NotFoundError, ConflictError } from "../errors/AppError";
import { User, Role } from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";

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
    it("returns the user when found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.getUserById("user-1");

      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });

    it("throws NotFoundError when user does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(UserService.getUserById("missing-id")).rejects.toThrow(NotFoundError);
    });
  });

  describe("createUser", () => {
    const input = {
      email: "alice@cameraclub.fi",
      name: "Alice Virtanen",
      role: Role.MEMBER,
    };

    it("creates and returns the new user", async () => {
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await UserService.createUser(input);

      expect(result).toEqual(mockUser);
    });

    it("calls prisma.user.create with the correct data payload", async () => {
      prismaMock.user.create.mockResolvedValue(mockUser);

      await UserService.createUser(input);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { ...input, id: expect.any(String), emailVerified: false },
      });
    });

    it("throws ConflictError when email already exists (P2002)", async () => {
      const uniqueViolation = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        { code: "P2002", clientVersion: "7.0.0", meta: { target: ["email"] } }
      );
      prismaMock.user.create.mockRejectedValue(uniqueViolation);

      await expect(UserService.createUser(input)).rejects.toThrow(ConflictError);
    });
  });
});
