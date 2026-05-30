import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    donor: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  }
  return { prisma: tx }
})

import { getDonors, addDonor, deleteDonor } from "./donors.service.js"
import { prisma } from "../../lib/prisma.js"

describe("donors.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("getDonors", () => {
    it("должен вернуть список донатеров", async () => {
      vi.mocked(prisma.donor.findMany).mockResolvedValue([
        { id: 1, name: "Иван" },
        { id: 2, name: "Петр" },
      ] as any)

      const result = await getDonors()

      expect(result).toHaveLength(2)
      expect(prisma.donor.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } })
    })

    it("должен вернуть пустой массив", async () => {
      vi.mocked(prisma.donor.findMany).mockResolvedValue([])

      const result = await getDonors()

      expect(result).toEqual([])
    })
  })

  describe("addDonor", () => {
    it("должен добавить донатера", async () => {
      vi.mocked(prisma.donor.create).mockResolvedValue({ id: 1, name: "Иван" } as any)

      const result = await addDonor("Иван")

      expect(result).toEqual({ id: 1, name: "Иван" })
      expect(prisma.donor.create).toHaveBeenCalledWith({ data: { name: "Иван" } })
    })

    it("должен обрезать лишние пробелы", async () => {
      vi.mocked(prisma.donor.create).mockResolvedValue({ id: 2, name: "Test" } as any)

      await addDonor("  Test  ")

      expect(prisma.donor.create).toHaveBeenCalledWith({ data: { name: "Test" } })
    })
  })

  describe("deleteDonor", () => {
    it("должен удалить донатера", async () => {
      vi.mocked(prisma.donor.delete).mockResolvedValue({ id: 1 } as any)

      await deleteDonor(1)

      expect(prisma.donor.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })
  })
})
