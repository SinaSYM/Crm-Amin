import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient, UserRole, UserScope } = require('@prisma/client')

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.')
}
if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.')
}
if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.')
}

function hashPassword(plain) {
    const salt = crypto.randomBytes(16)
    const derived = crypto.scryptSync(plain, salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024,
    })
    return `scrypt$16384$8$1$${salt.toString('base64')}$${derived.toString('base64')}`
}

const prisma = new PrismaClient({ log: ['error'] })

try {
    const existing = await prisma.user.findUnique({ where: { email } })
    const passwordHash = hashPassword(password)

    if (existing && existing.role !== UserRole.ADMIN) {
        throw new Error(`Refusing to overwrite non-admin user ${email}.`)
    }

    if (existing) {
        await prisma.user.update({
            where: { id: existing.id },
            data: {
                passwordHash,
                isApproved: true,
                is_active: true,
                scope: UserScope.GLOBAL,
            },
        })
        console.log(`Updated production admin ${email}.`)
    } else {
        await prisma.user.create({
            data: {
                email,
                passwordHash,
                first_name: 'مدیر',
                last_name: 'سیستم',
                phone_number: `system-admin-${Date.now()}`,
                role: UserRole.ADMIN,
                is_active: true,
                isApproved: true,
                scope: UserScope.GLOBAL,
                department: 'MANAGEMENT',
            },
        })
        console.log(`Created production admin ${email}.`)
    }
} finally {
    await prisma.$disconnect()
}
