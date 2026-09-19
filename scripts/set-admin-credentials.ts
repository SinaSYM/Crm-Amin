import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

async function main() {
  const admin =
    (await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } })) ??
    (await prisma.user.findUnique({ where: { email: 'admin@amincrm.ir' } }))

  if (!admin) {
    console.error('No admin user found')
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      email: 'admin',
      passwordHash: hashPassword('admin'),
      is_active: true,
      isApproved: true,
    },
  })

  console.log(`Updated admin credentials for user ${admin.id} (${admin.first_name} ${admin.last_name})`)
}

main().finally(() => prisma.$disconnect())
