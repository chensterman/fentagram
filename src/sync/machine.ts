import { accountKey, type Account } from '../domain/account.ts'
import type { CountReading } from '../domain/count.ts'
import type { ListStatus, StopReason } from '../domain/snapshot.ts'
import type { CollectOptions, ListReader, PageSignal } from './types.ts'

export interface ListResult {
  accounts: Account[]
  status: Extract<ListStatus, 'complete' | 'estimated' | 'partial'>
  stopReason: StopReason
}

interface Decision {
  type: 'continue' | 'backoff' | 'complete' | 'estimated' | 'stalled'
  emptySettles: number
  stallRetries: number
}

export async function collectList(
  reader: ListReader,
  seed: Account[],
  options: CollectOptions,
): Promise<ListResult> {
  const collected = new Map<string, Account>()
  merge(collected, seed)

  let afterScroll = false
  let lastSignal: PageSignal = 'settled'
  let emptySettles = 0
  let stallRetries = 0

  for (let step = 0; step < options.maxSteps; step += 1) {
    merge(collected, reader.readAccounts())
    options.onProgress?.({ accounts: [...collected.values()] })
    const interruption = reader.poll()
    if (interruption !== 'ok') {
      return finish(collected, 'partial', interruption === 'hidden' ? 'paused' : 'blocked')
    }

    if (afterScroll && lastSignal === 'grew') {
      emptySettles = 0
      stallRetries = 0
    }

    if (afterScroll && lastSignal === 'settled') {
      const decision = decideEmpty(
        reader.readHeaderCount(),
        collected.size,
        emptySettles,
        stallRetries,
        options,
      )
      emptySettles = decision.emptySettles
      stallRetries = decision.stallRetries
      if (decision.type === 'complete') return finish(collected, 'complete', 'done')
      if (decision.type === 'estimated') return finish(collected, 'estimated', 'done')
      if (decision.type === 'stalled') return finish(collected, 'partial', 'stalled')
      if (decision.type === 'backoff') await options.sleep(options.backoffMs)
    }

    await options.sleep(options.delayMs)
    const paused = reader.poll()
    if (paused !== 'ok') {
      return finish(collected, 'partial', paused === 'hidden' ? 'paused' : 'blocked')
    }

    reader.scrollToEnd()
    lastSignal = await reader.waitForPage()
    afterScroll = true
    if (lastSignal === 'blocked' || lastSignal === 'hidden') {
      merge(collected, reader.readAccounts())
      return finish(collected, 'partial', lastSignal === 'hidden' ? 'paused' : 'blocked')
    }
  }

  throw new Error('collectList exceeded maxSteps')
}

function decideEmpty(
  header: CountReading | null,
  size: number,
  emptySettles: number,
  stallRetries: number,
  options: CollectOptions,
): Decision {
  if (header?.kind === 'exact') {
    if (size >= header.value) {
      return { type: 'complete', emptySettles, stallRetries }
    }
    const nextRetries = stallRetries + 1
    if (nextRetries >= options.maxStallRetries) {
      return { type: 'stalled', emptySettles, stallRetries: nextRetries }
    }
    return { type: 'backoff', emptySettles, stallRetries: nextRetries }
  }

  const nextSettles = emptySettles + 1
  if (nextSettles >= options.settleStrikes) {
    return { type: 'estimated', emptySettles: nextSettles, stallRetries }
  }
  return { type: 'continue', emptySettles: nextSettles, stallRetries }
}

function merge(into: Map<string, Account>, visible: Account[]): void {
  for (const item of visible) {
    const username = item.username.trim()
    if (!username) continue
    const key = accountKey(username)
    const existing = into.get(key)
    into.set(key, {
      username: existing?.username ?? username,
      href: item.href || existing?.href || `https://www.instagram.com/${username}/`,
    })
  }
}

function finish(
  collected: Map<string, Account>,
  status: ListResult['status'],
  stopReason: StopReason,
): ListResult {
  return {
    accounts: [...collected.values()].sort((a, b) => a.username.localeCompare(b.username)),
    status,
    stopReason,
  }
}
