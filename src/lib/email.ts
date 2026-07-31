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
//    rendered email (subject + body) plus the OTP code are written to
//    console.log AND to /tmp/otp-debug.log (readable from SSH). The
//    request-code API also returns the code inline so the local UI can
//    show it without leaving the page.

import { createHmac, randomUUID } from 'crypto'
import { mkdir, appendFile } from 'fs/promises'
import path from 'path'

export type OtpEmail = {
  to: string
  subject: string
  htmlBody: string
  code: string
}

export type SendResult =
  | { ok: true; via: 'directmail' | 'debug-log' }
  | { ok: false; error: string }

const DEBUG_LOG_PATH = '/tmp/otp-debug.log'

function hasDirectMailCreds() {
  return !!(
    process.env.DIRECT_MAIL_ACCESS_KEY_ID &&
    process.env.DIRECT_MAIL_ACCESS_KEY_SECRET &&
    process.env.DIRECT_MAIL_FROM
  )
}

async function sendViaDirectMail(email: OtpEmail): Promise<SendResult> {
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

  // The canonical query string IS the URL query — do NOT pass it through
  // URLSearchParams.toString(), which would re-encode values and double-encode
  // any '%' characters (e.g. the `%40` in noreply%40blog.dogeggcode.cyou
  // became `%2540`, which Aliyun's signature check rejected).
  const sortedKeys = Object.keys(params).sort()
  const query = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&')
  const endpoint = `https://dm.aliyuncs.com/?${query}`

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
  // Aliyun v3 signing: canonical query string is sorted with each value
  // percent-encoded once, then the entire canonical is percent-encoded
  // again to produce the tail of StringToSign. The double-encoding of
  // values (e.g. `@` becomes `%40` in canonical, then `%2540` in the
  // string-to-sign) is correct per spec — verified against Aliyun's
  // "server string to sign is:" error response.
  //
  //   CanonicalizedQueryString: sorted k=enc(v) joined by &
  //   StringToSign: HTTPMethod&%2F&percentEncode(CanonicalizedQueryString)
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&')
  const stringToSign = `GET&%2F&${percentEncode(sorted)}`
  return createHmac('sha1', `${secret}&`).update(stringToSign).digest('base64')
}

function percentEncode(s: string): string {
  // Aliyun's percentEncode is stricter than JS encodeURIComponent: also
  // encodes ! ' ( ) (the latter are valid URL chars per RFC 3986 but Aliyun
  // encodes them anyway — e.g. our HTML body had '!doctype' but the server
  // expected '%21doctype', causing "Specified signature is not matched").
  return encodeURIComponent(s)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/%7E/g, '~')
}

async function sendViaDebugLog(email: OtpEmail): Promise<SendResult> {
  const line = [
    '---',
    `at: ${new Date().toISOString()}`,
    `to: ${email.to}`,
    `subject: ${email.subject}`,
    `code: ${email.code}`,
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

export async function sendOtpCode(args: { to: string; code: string }): Promise<SendResult> {
  const email: OtpEmail = {
    to: args.to,
    subject: '您的 LB Blog 登录验证码',
    htmlBody: otpHtml(args.code),
    code: args.code,
  }
  if (hasDirectMailCreds()) {
    return sendViaDirectMail(email)
  }
  return sendViaDebugLog(email)
}

function otpHtml(code: string): string {
  return `<!doctype html><html><body style="font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;background:#0f0f13;color:#e2e8f0;padding:40px 16px;">
<div style="max-width:480px;margin:0 auto;background:#0a0a0e;border:1px solid rgba(245,199,26,0.2);border-radius:12px;padding:32px;">
  <h1 style="margin:0 0 16px;font-size:1.4rem;color:#f5c71a;">登录 LB Blog</h1>
  <p style="margin:0 0 8px;line-height:1.6;color:#a08960;">您的验证码（10 分钟内有效，仅可使用一次）：</p>
  <div style="margin:0 0 24px;padding:24px 16px;background:rgba(245,199,26,0.08);border:1px dashed rgba(245,199,26,0.4);border-radius:10px;text-align:center;">
    <span style="font-family:'SF Mono','Monaco','Menlo','Consolas',monospace;font-size:2.6rem;font-weight:700;letter-spacing:0.5em;color:#f5c71a;">${code}</span>
  </div>
  <p style="margin:0 0 8px;line-height:1.6;color:#a08960;">请回到 LB Blog 的登录页（<a href="https://blog.dogeggcode.cyou/login" style="color:#f5c71a;">blog.dogeggcode.cyou/login</a>）输入这 6 位数字完成登录。</p>
  <hr style="margin:24px 0;border:none;border-top:1px solid rgba(245,199,26,0.1);">
  <p style="margin:0;font-size:0.78rem;color:#a08960;">如果不是你本人请求，请忽略此邮件。</p>
</div>
</body></html>`
}

export const emailDebugLogPath = DEBUG_LOG_PATH
