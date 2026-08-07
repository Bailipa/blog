import { randomBytes } from 'crypto'

// 生成兑换码（面包多「卡密」商品）。买家在面包多付款后自动拿到其中一个
// 码，回本站 /purchase/redeem 兑换解锁。
export function generateRedeemCode(): string {
  // 12 chars, uppercase + digits, grouped 4-4-4 for readability.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
  const bytes = randomBytes(12)
  const part = (from: number, to: number) =>
    Array.from(bytes.slice(from, to))
      .map((b) => alphabet[b % alphabet.length])
      .join('')
  return `${part(0, 4)}-${part(4, 8)}-${part(8, 12)}`
}

export function isValidRedeemCode(code: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code.trim().toUpperCase())
}
