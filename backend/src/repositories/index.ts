import { prisma } from "../lib/prisma.js";
import { TierListRepository } from "./tier-list.repository.js";

export const tierListRepository = new TierListRepository(prisma);
