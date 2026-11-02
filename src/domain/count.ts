export interface CountReading {
  kind: 'exact' | 'abbreviated'
  value: number
  raw: string
}

const COUNT_TOKEN = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?\s*[kKmM]|\d+)/

/** Profile totals can be a few higher than what the followers/following modal returns. */
export function countShortfallTolerance(exactCount: number): number {
  return Math.ceil(exactCount * 0.005)
}

export function parseCount(raw: string): CountReading | null {
  const match = raw.trim().match(COUNT_TOKEN)
  if (!match?.[1]) return null

  const token = match[1].replace(/\s+/g, '')
  const abbreviated = token.match(/^(\d+(?:\.\d+)?)([kKmM])$/)
  if (abbreviated?.[1] && abbreviated[2]) {
    const magnitude = abbreviated[2].toLowerCase() === 'm' ? 1_000_000 : 1_000
    return {
      kind: 'abbreviated',
      value: Math.round(Number(abbreviated[1]) * magnitude),
      raw,
    }
  }

  const value = Number(token.replace(/,/g, ''))
  if (!Number.isFinite(value)) return null
  return { kind: 'exact', value, raw }
}
