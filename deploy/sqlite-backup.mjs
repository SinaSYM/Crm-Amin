import { backup, DatabaseSync } from 'node:sqlite'

const [source, destination] = process.argv.slice(2)

if (!source || !destination) {
    throw new Error('Usage: node sqlite-backup.mjs <source.db> <destination.db>')
}

const sourceDatabase = new DatabaseSync(source, { readOnly: true })
try {
    await backup(sourceDatabase, destination)
} finally {
    sourceDatabase.close()
}
