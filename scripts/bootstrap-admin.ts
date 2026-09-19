import { PrismaClient, UserRole, UserScope } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must both be set in the environment. No hardcoded fallback is provided.')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  const passwordHash = hashPassword(password)

  if (existing) {
    if (existing.role !== UserRole.ADMIN) {
      console.error(`Refusing to overwrite non-ADMIN user at ${email}.`)
      process.exit(1)
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, isApproved: true, is_active: true, scope: UserScope.GLOBAL },
    })
    console.log(`✅ Updated bootstrap admin: ${email}`)
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        first_name: 'مدیر',
        last_name: 'سیستم',
        phone_number: `+98${Date.now()}`.slice(-11),
        role: UserRole.ADMIN,
        is_active: true,
        isApproved: true,
        scope: UserScope.GLOBAL,
        department: 'MANAGEMENT',
      },
    })
    console.log(`✅ Created bootstrap admin: ${email}`)
  }
  console.log(`   login email    : ${email}`)
  console.log(`   login password : <provided via ADMIN_PASSWORD env var>`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
