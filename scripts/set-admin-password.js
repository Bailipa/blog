// Set / overwrite the password for an admin user. Used to bootstrap
// /admin/login after we switched away from magic-link auth.
//
// Usage:
//   node scripts/set-admin-password.js <username>          # generates a random password and prints it
//   node scripts/set-admin-password.js <username> <password>
//
// Connects to DATABASE_URL from env (or .env in CWD). Run on the server
// against the live dev.db, or locally against your dev seed db.

import { PrismaClient } from '../src/generated/prisma/client.js'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'

const username = process.argv[2]
const explicitPassword = process.argv[3]

if (!username) {
  console.error('Usage: node scripts/set-admin-password.js <username> [password]')
  console.error('If password is omitted, a random 16-char one is generated and printed once.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({ where: { username } })
  if (!user) {
    console.error(`User not found: ${username}`)
    process.exit(1)
  }
  if (!user.isAdmin) {
    console.error(`User "${username}" is not isAdmin=true. Refusing to set password.`)
    process.exit(1)
  }

  let password = explicitPassword
  if (!password) {
    // 12 bytes → 16 base64 chars (stripping padding). Random, URL-safe-ish.
    password = randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16)
  }

  const hashed = await hash(password, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  })

  console.log(`Password set for user "${username}" (id=${user.id})`)
  if (!explicitPassword) {
    console.log('')
    console.log('  Generated password (SAVE THIS NOW — it is not stored anywhere):')
    console.log('')
    console.log(`    ${password}`)
    console.log('')
  }
}

main()
  .catch((e) => {
    console.error('[set-admin-password] failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
