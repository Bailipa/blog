import { auth } from './auth'
import { unauthorized } from './apiErrorHandler'

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.isAdmin) throw unauthorized()
  return session
}
