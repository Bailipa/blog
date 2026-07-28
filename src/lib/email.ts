// Email sending abstraction. Two modes:
//
// 1. PROD: Aliyun DirectMail REST API (https://dm.aliyuncs.com/, action
//    SingleSendMail). Requires env:
//      DIRECT_MAIL_ACCESS_KEY_ID
//      DIRECT_MAIL_ACCESS_KEY_SECRET
//      DIRECT_MAIL_FROM         (sender address, e.g. mail@blog.dogeggcode.cyou)
//      DIRECT_MAIL_FROM_NAME    (display name, optional)
//
// 2. DEV: When DirectMail creds are absent, we never call out. The full
//    rendered email (subject + body) plus the magic-link URL are written to
//    console.log AND to /tmp/magic-link-debug.log (readable from SSH). The
//    request-link API also returns the URL inline so the local UI can show
//    it without leaving the page.

import { createHmac, randomUUID } from 'crypto'
import { mkdir, appendFile } from 'fs/promises'
import path from 'path'

export type MagicLinkEmail = {
  to: string
  subject: string
  htmlBody: string
  url: string
}

export type SendResult =
  | { ok: true; via: 'directmail' | 'debug-log' }
  | { ok: false; error: string }

const DEBUG_LOG_PATH = '/tmp/magic-link-debug.log'

function hasDirectMailCreds() {
  return !!(
    process.env.DIRECT_MAIL_ACCESS_KEY_ID &&
    process.env.DIRECT_MAIL_ACCESS_KEY_SECRET &&
    process.env.DIRECT_MAIL_FROM
  )
}

async function sendViaDirectMail(email: MagicLinkEmail): Promise<SendResult> {
  const ak = process.env.DIRECT_MAIL_ACCESS_KEY_ID!
  const sk = process.env.DIRECT_MAIL_ACCESS_KEY_SECRET!
  const from = process.env.DIRECT_MAIL_FROM!
  const fromAlias = process.env.DIRECT_MAIL_FROM_NAME ?? 'LB Blog'

  const params: Record<string, string> = {
    AccessKeyId: ak,
    AccountName: from,
    Action: 'SingleSendMail',
    AddressType: '1',
    Format: 'JSON',
    FromAlias: fromAlias,
    HtmlBody: email.htmlBody,
    RegionId: process.env.DIRECT_MAIL_REGION ?? 'cn-hangzhou',
    ReplyToAddress: 'true',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: randomUUID(),
    SignatureVersion: '1.0',
    Subject: email.subject,
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ToAddress: email.to,
    Version: '2015-11-23',
  }
  params.Signature = signAliyun(params, sk)

  const body = new URLSearchParams(params).toString()
  const endpoint = `https://dm.aliyuncs.com/?${body}`

  try {
    const res = await fetch(endpoint, { method: 'GET' })
    const text = await res.text()
    let json: { EnvId?: string; RequestId?: string; Message?: string; Code?: string }
    try {
      json = JSON.parse(text)
    } catch {
      json = { Message: text.slice(0, 200) }
    }
    if (res.ok && !json.Code) {
      return { ok: true, via: 'directmail' }
    }
    return { ok: false, error: json.Message ?? json.Code ?? `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function signAliyun(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&')
  const stringToSign = `GET&%2F&${percentEncode(sorted)}`
  return createHmac('sha1', `${secret}&`).update(stringToSign).digest('base64')
}

function percentEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

async function sendViaDebugLog(email: MagicLinkEmail): Promise<SendResult> {
  const line = [
    '---',
    `at: ${new Date().toISOString()}`,
    `to: ${email.to}`,
    `subject: ${email.subject}`,
    `url: ${email.url}`,
    `body:`,
    email.htmlBody,
    '',
  ].join('\n')
  console.log(`[email/dev] ${line}`)
  try {
    await mkdir(path.dirname(DEBUG_LOG_PATH), { recursive: true })
    await appendFile(DEBUG_LOG_PATH, line, 'utf8')
  } catch (e) {
    console.warn('[email/dev] could not write debug log:', e)
  }
  return { ok: true, via: 'debug-log' }
}

export async function sendMagicLink(args: { to: string; url: string }): Promise<SendResult> {
  const email: MagicLinkEmail = {
    to: args.to,
    subject: '登录 LB Blog',
    htmlBody: magicLinkHtml(args.url),
    url: args.url,
  }
  if (hasDirectMailCreds()) {
    return sendViaDirectMail(email)
  }
  return sendViaDebugLog(email)
}

function magicLinkHtml(url: string): string {
  return `<!doctype html><html><body style="font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;background:#0f0f13;color:#e2e8f0;padding:40px 16px;">
<div style="max-width:480px;margin:0 auto;background:#0a0a0e;border:1px solid rgba(245,199,26,0.2);border-radius:12px;padding:32px;">
  <h1 style="margin:0 0 16px;font-size:1.4rem;color:#f5c71a;">登录 LB Blog</h1>
  <p style="margin:0 0 24px;line-height:1.6;color:#a08960;">点击下方按钮登录管理后台。链接 15 分钟内有效，仅可使用一次。</p>
  <p style="margin:0 0 24px;">
    <a href="${url}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#8b6914,#f5c71a);color:#0a0806;text-decoration:none;border-radius:8px;font-weight:600;">登录</a>
  </p>
  <p style="margin:0 0 8px;font-size:0.85rem;color:#a08960;">如果按钮无效，请复制链接到浏览器：</p>
  <p style="margin:0;font-size:0.8rem;word-break:break-all;color:#c99a2a;">${url}</p>
  <hr style="margin:24px 0;border:none;border-top:1px solid rgba(245,199,26,0.1);">
  <p style="margin:0;font-size:0.78rem;color:#a08960;">如果不是你本人请求，请忽略此邮件。</p>
</div>
</body></html>`
}

export const emailDebugLogPath = DEBUG_LOG_PATH