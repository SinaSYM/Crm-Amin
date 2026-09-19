import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  console.log(JSON.stringify(users.map(u => ({ id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name, is_active: u.is_active, isApproved: u.isApproved })), null, 2))
}

main().finally(() => prisma.$disconnect())
