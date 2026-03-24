import prisma from "../lib/prisma";
import { User, Prisma } from "../generated/prisma/client";
import { NotFoundError, ConflictError } from "../errors/AppError";
import { CreateUserInput } from "./user.schema";

export const UserService = {
  async listUsers(): Promise<User[]> {
    return prisma.user.findMany();
  },

  async getUserById(id: string): Promise<User> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return user;
  },

  async createUser(data: CreateUserInput): Promise<User> {
    try {
      return await prisma.user.create({ data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictError(`A user with email ${data.email} already exists`);
      }
      throw err;
    }
  },
};
