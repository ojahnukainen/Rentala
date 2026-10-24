import { describe, it, expect } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { promoteAdmin } from "./promoteAdmin";
import { NotFoundError, ValidationError } from "../errors/AppError";
import { Role, User } from "../generated/prisma/client";

const now = new Date();

const member: User = {
  id: "user-1",
  email: "alice@cameraclub.fi",
  name: "Alice Virtanen",
  role: Role.MEMBER,
  emailVerified: false,
  image: null,
  createdAt: now,
  updatedAt: now,
};

describe("promoteAdmin", () => {
  it("sets role to ADMIN for an existing member", async () => {
    prismaMock.user.findUnique.mockResolvedValue(member);
    prismaMock.user.update.mockResolvedValue({ ...member, role: Role.ADMIN });

    const result = await promoteAdmin("alice@cameraclub.fi");

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: Role.ADMIN },
    });
    expect(result).toEqual({ email: "alice@cameraclub.fi", alreadyAdmin: false });
  });

  // better-auth stores emails lowercased, so a pasted "Alice@CameraClub.fi"
  // must still find the account.
  it("normalises the email before looking it up", async () => {
    prismaMock.user.findUnique.mockResolvedValue(member);
    prismaMock.user.update.mockResolvedValue({ ...member, role: Role.ADMIN });

    await promoteAdmin("  Alice@CameraClub.fi ");

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "alice@cameraclub.fi" },
    });
  });

  it("does not write when the user is already an admin", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...member, role: Role.ADMIN });

    const result = await promoteAdmin("alice@cameraclub.fi");

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(result).toEqual({ email: "alice@cameraclub.fi", alreadyAdmin: true });
  });

  it("throws NotFoundError when no user has that email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(promoteAdmin("nobody@cameraclub.fi")).rejects.toThrow(NotFoundError);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("throws ValidationError when the email is empty", async () => {
    await expect(promoteAdmin("   ")).rejects.toThrow(ValidationError);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
