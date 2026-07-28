import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    allowPasswordLogin: process.env.ALLOW_PASSWORD_LOGIN === 'true',
  })
}