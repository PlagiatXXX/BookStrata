import { prisma } from '../../lib/prisma.js'

export interface DonorItem {
  id: number
  name: string
}

export async function getDonors(): Promise<DonorItem[]> {
  return prisma.donor.findMany({
    orderBy: { id: 'asc' },
  })
}

export async function addDonor(name: string): Promise<DonorItem> {
  const donor = await prisma.donor.create({
    data: { name: name.trim() },
  })
  return donor
}

export async function deleteDonor(id: number): Promise<void> {
  await prisma.donor.delete({ where: { id } })
}
