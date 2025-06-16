import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var __prisma__: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["error", "warn"],
  });
} else {
  if (!global.__prisma__) {
    global.__prisma__ = new PrismaClient({
      log: ["query", "error", "warn"],
    });
  }
  prisma = global.__prisma__;
}

export { prisma };
