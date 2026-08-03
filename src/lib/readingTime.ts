type ReadingSpeedConfig = {
  cnCharsPerMinute: number
  enWordsPerMinute: number
  codeCharsPerMinute: number
  minMinutes: number
}

const DEFAULT_SPEED: ReadingSpeedConfig = {
  cnCharsPerMinute: 400,
  enWordsPerMinute: 250,
  codeCharsPerMinute: 800,
  minMinutes: 1,
}

const FENCED_CODE_RE = /```[\s\S]*?```/g
const INLINE_CODE_RE = /`[^`\n]+`/g
const CN_CHAR_RE = /[\u4e00-\u9fa5]/g
const EN_WORD_RE = /[A-Za-z]+/g

export type ReadingTime = {
  minutes: number
  cnChars: number
  enWords: number
  codeChars: number
}

export function readingTimeOf(markdown: string | null | undefined, speed: ReadingSpeedConfig = DEFAULT_SPEED): ReadingTime {
  if (!markdown) {
    return { minutes: speed.minMinutes, cnChars: 0, enWords: 0, codeChars: 0 }
  }

  const codeBlocks = markdown.match(FENCED_CODE_RE) ?? []
  const codeChars = codeBlocks.reduce((sum, block) => sum + block.length, 0)
  const inlineCodes = markdown.match(INLINE_CODE_RE) ?? []
  const inlineCodeChars = inlineCodes.reduce((sum, block) => sum + block.length, 0)

  const text = markdown.replace(FENCED_CODE_RE, '').replace(INLINE_CODE_RE, '')
  const cnChars = (text.match(CN_CHAR_RE) ?? []).length
  const enWords = (text.match(EN_WORD_RE) ?? []).length

  const totalCode = codeChars + inlineCodeChars
  const minutes = cnChars / speed.cnCharsPerMinute + enWords / speed.enWordsPerMinute + totalCode / speed.codeCharsPerMinute

  return {
    minutes: Math.max(speed.minMinutes, Math.ceil(minutes)),
    cnChars,
    enWords,
    codeChars: totalCode,
  }
}

export function readingMinutes(markdown: string | null | undefined): number {
  return readingTimeOf(markdown).minutes
}