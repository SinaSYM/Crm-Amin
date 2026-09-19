import { PrismaClient, UserRole } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const department = 'MANAGEMENT'
    const where: any = {}
    where.OR = [
      {
        role: UserRole.SALES_AGENT,
        department: department
      },
      {
        role: UserRole.STUDENT,
        enrollments: {
          some: {
            course: {
              department: department
            }
          }
        }
      }
    ]

    console.log('Running findMany...')
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            assignedLeads: true,
            interactions: true,
            enrollments: true,
          },
        },
      },
    })
    console.log('Query succeeded! Total users found:', users.length)
  } catch (err) {
    console.error('Prisma query failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
