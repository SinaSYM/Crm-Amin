import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const [email] = process.argv.slice(2)

  if (!email) {
    console.error('Usage: tsx scripts/activate-user.ts <email>')
    process.exit(1)
  }

  const u = await prisma.user.findUnique({ where: { email } })
  if (!u) {
    console.error(`User with email ${email} not found.`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: u.id },
    data: { is_active: true },
  })
  console.log(`Successfully activated user ${email}`)
}

main().finally(() => prisma.$disconnect())
