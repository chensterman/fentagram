import { describe, expect, test } from 'vitest'
import { countShortfallTolerance, parseCount } from './count.ts'

describe('countShortfallTolerance', () => {
  test('allows a small gap on large lists', () => {
    expect(countShortfallTolerance(4945)).toBe(25)
    expect(4945 - 4942).toBeLessThanOrEqual(countShortfallTolerance(4945))
  })
})

describe('parseCount', () => {
  test('reads an exact grouped number', () => {
    expect(parseCount('1,234')).toEqual({ kind: 'exact', value: 1234, raw: '1,234' })
    expect(parseCount('1,234 followers')).toEqual({
      kind: 'exact',
      value: 1234,
      raw: '1,234 followers',
    })
  })

  test('reads an ungrouped exact number', () => {
    expect(parseCount('86')).toEqual({ kind: 'exact', value: 86, raw: '86' })
  })

  test('reads abbreviated thousands and millions', () => {
    expect(parseCount('12.4K')).toEqual({ kind: 'abbreviated', value: 12400, raw: '12.4K' })
    expect(parseCount('12.4k followers')).toEqual({
      kind: 'abbreviated',
      value: 12400,
      raw: '12.4k followers',
    })
    expect(parseCount('12K')).toEqual({ kind: 'abbreviated', value: 12000, raw: '12K' })
    expect(parseCount('1.2M')).toEqual({ kind: 'abbreviated', value: 1_200_000, raw: '1.2M' })
  })

  test('returns null when there is no count', () => {
    expect(parseCount('followers')).toBeNull()
    expect(parseCount('')).toBeNull()
  })
})
