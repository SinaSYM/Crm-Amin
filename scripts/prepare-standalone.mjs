import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const standaloneDir = join(projectRoot, '.next', 'standalone')

if (!existsSync(join(standaloneDir, 'server.js'))) {
    throw new Error('Next.js standalone output is missing. Run next build first.')
}

function replaceDirectory(source, destination) {
    if (!existsSync(source)) return
    rmSync(destination, { recursive: true, force: true })
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(source, destination, { recursive: true })
}

replaceDirectory(
    join(projectRoot, '.next', 'static'),
    join(standaloneDir, '.next', 'static')
)
replaceDirectory(join(projectRoot, 'public'), join(standaloneDir, 'public'))
replaceDirectory(
    join(projectRoot, 'prisma'),
    join(standaloneDir, 'ops', 'prisma')
)

const workerSource = join(projectRoot, 'src', 'cron', 'reminder-worker.js')
const workerDestination = join(standaloneDir, 'workers', 'reminder-worker.js')
mkdirSync(dirname(workerDestination), { recursive: true })
cpSync(workerSource, workerDestination)

console.log('Standalone runtime assets prepared.')
