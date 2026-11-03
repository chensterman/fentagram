import { describe, expect, test, vi } from 'vitest'
import type { CollectOptions } from './types.ts'
import { collectList } from './machine.ts'
import { FakeList, names, pageOf } from './fakeList.ts'
import { parseCount } from '../domain/count.ts'

const options: CollectOptions = {
  delayMs: 0,
  settleStrikes: 3,
  maxSteps: 100,
  sleep: async () => {},
}

function exact(value: number) {
  const reading = parseCount(String(value))
  if (!reading) throw new Error('expected a count')
  return reading
}

describe('collectList', () => {
  test('keeps accounts from pages that have scrolled away', async () => {
    const pages = [pageOf(0, 24), pageOf(24, 24), pageOf(48, 24)]
    const list = new FakeList(pages, exact(72))

    const result = await collectList(list, [], options)

    expect(result.status).toBe('complete')
    expect(names(result.accounts)).toEqual(names(pages.flat()))
    expect(list.readAccounts()).toEqual(pages[2])
  })

  test('stores an account once when it appears on two pages', async () => {
    const pages = [pageOf(0, 24), [...pageOf(20, 4), ...pageOf(24, 20)]]
    const list = new FakeList(pages, exact(44))

    const result = await collectList(list, [], options)

    expect(result.status).toBe('complete')
    expect(result.accounts).toHaveLength(44)
  })

  test('waits for a slow page before scrolling again', async () => {
    const pages = [pageOf(0, 12), pageOf(12, 12)]
    const list = new FakeList(pages, exact(24))
    list.holdNextWait()

    const pending = collectList(list, [], options)
    await vi.waitUntil(() => list.waiting)
    expect(list.scrolls).toBe(1)

    list.release()
    const result = await pending

    expect(result.status).toBe('complete')
    expect(names(result.accounts)).toEqual(names(pages.flat()))
  })

  test('finishes when a settled scroll matches an exact header count', async () => {
    const pages = [pageOf(0, 24), pageOf(24, 12)]
    const list = new FakeList(pages, exact(36))

    const result = await collectList(list, [], options)

    expect(result.status).toBe('complete')
    expect(result.stopReason).toBe('done')
    expect(result.accounts).toHaveLength(36)
  })

  test('estimates when scrolls stop adding profiles before the header count', async () => {
    const pages = [pageOf(0, 12), pageOf(12, 12)]
    const list = new FakeList(pages, exact(100))

    const result = await collectList(list, [], options)

    expect(result.status).toBe('estimated')
    expect(result.stopReason).toBe('done')
    expect(names(result.accounts)).toEqual(names(pages.flat()))
  })

  test('estimates when pagination ends slightly below the profile count', async () => {
    const pages = [pageOf(0, 4942)]
    const list = new FakeList(pages, exact(4945))

    const result = await collectList(list, [], options)

    expect(result.status).toBe('estimated')
    expect(result.stopReason).toBe('done')
    expect(result.accounts).toHaveLength(4942)
  })

  test('marks an abbreviated header estimated after empty settled scrolls', async () => {
    const pages = [pageOf(0, 12), pageOf(12, 12)]
    const header = parseCount('12.4K')
    if (!header) throw new Error('expected a count')
    const list = new FakeList(pages, header)

    const result = await collectList(list, [], options)

    expect(result.status).toBe('estimated')
    expect(result.accounts).toHaveLength(24)
  })

  test('stops on a challenge and keeps the partial set', async () => {
    const pages = [pageOf(0, 12), pageOf(12, 12), pageOf(24, 12)]
    const list = new FakeList(pages, exact(36), { blockAfterScrolls: 2 })

    const result = await collectList(list, [], options)

    expect(result.status).toBe('partial')
    expect(result.stopReason).toBe('blocked')
    expect(names(result.accounts)).toEqual(names([...pages[0], ...pages[1]]))
  })
})
