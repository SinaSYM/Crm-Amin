import { PrismaClient, UserRole } from '@prisma/client'
import crypto from 'node:crypto'

const prisma = new PrismaClient()

const N = 16384
const r = 8
const p = 1
const KEY_LEN = 64
const SALT_LEN = 16
const SCRYPT_MAXMEM = 64 * 1024 * 1024

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(SALT_LEN)
  const derived = crypto.scryptSync(plain, salt, KEY_LEN, { N, r, p, maxmem: SCRYPT_MAXMEM })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${derived.toString('base64')}`
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let result = ''
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

async function main() {
  const email = 'admin@amincrm.ir'
  const password = generatePassword(14)
  const passwordHash = hashPassword(password)

  // Find existing admin or create new one
  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, is_active: true }
  })

  if (existingAdmin) {
    // Update existing admin with email and password
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { email, passwordHash, isApproved: true }
    })
    console.log(`✅ Updated existing admin: ${existingAdmin.first_name} ${existingAdmin.last_name}`)
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Password: ${password}`)
    console.log(`📱 Phone: ${existingAdmin.phone_number}`)
  } else {
    // Create new admin
    const admin = await prisma.user.create({
      data: {
        first_name: 'مدیر',
        last_name: 'سیستم',
        phone_number: '09000000000',
        role: UserRole.ADMIN,
        is_active: true,
        email,
        passwordHash,
        isApproved: true,
      }
    })
    console.log(`✅ Created admin user`)
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Password: ${password}`)
    console.log(`📱 Phone: ${admin.phone_number}`)
  }

  // Also set password for all demo users
  const demoPassword = 'Demo1234!'
  const demoHash = hashPassword(demoPassword)

  const demoUsers = [
    '09121234567', '09121234568', '09121234569', '09121234570',
    '09120000001', '09120000002', '09120000003', '09120000004',
    '09120000005', '09120000006'
  ]

  for (const phone of demoUsers) {
    const user = await prisma.user.findUnique({ where: { phone_number: phone } })
    if (user && !user.passwordHash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: demoHash, email: `${phone}@demo.local`, isApproved: true }
      })
      console.log(`✅ Set demo password for ${user.first_name} ${user.last_name} (${phone})`)
    }
  }

  console.log('\n🎉 Admin setup complete!')
  console.log('\n📋 Login Credentials:')
  console.log('━'.repeat(50))
  console.log(`📧 Admin Email:    ${email}`)
  console.log(`🔑 Admin Password: ${password}`)
  console.log('━'.repeat(50))
  console.log(`\n💡 Demo users all have password: ${demoPassword}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
