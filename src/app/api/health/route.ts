import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        await db.$queryRaw`SELECT 1`
        return NextResponse.json(
            {
                status: 'ok',
                database: 'ok',
                uptimeSeconds: Math.floor(process.uptime()),
                timestamp: new Date().toISOString(),
            },
            { headers: { 'Cache-Control': 'no-store' } }
        )
    } catch (error) {
        console.error('Health check failed:', error)
        return NextResponse.json(
            {
                status: 'error',
                database: 'unavailable',
                timestamp: new Date().toISOString(),
            },
            {
                status: 503,
                headers: { 'Cache-Control': 'no-store' },
            }
        )
    }
}
