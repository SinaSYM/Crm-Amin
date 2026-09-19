import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

async function main() {
  const [email, newPassword] = process.argv.slice(2)

  if (!email || !newPassword) {
    console.error('Usage: tsx scripts/reset-password.ts <email> <newPassword>')
    process.exit(1)
  }

  const u = await prisma.user.findUnique({ where: { email } })
  if (!u) {
    console.error(`User with email ${email} not found.`)
    process.exit(1)
  }

  const passwordHash = hashPassword(newPassword)
  await prisma.user.update({
    where: { id: u.id },
    data: { passwordHash },
  })
  console.log(`Password reset successfully for ${email}.`)
}

main().finally(() => prisma.$disconnect())
