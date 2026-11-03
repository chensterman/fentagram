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
  type: 'continue' | 'complete' | 'estimated'
  idleScrolls: number
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
  let idleScrolls = 0
  let sizeBeforeScroll = collected.size

  for (let step = 0; step < options.maxSteps; step += 1) {
    merge(collected, reader.readAccounts())
    options.onProgress?.({ accounts: [...collected.values()] })
    const interruption = reader.poll()
    if (interruption !== 'ok') {
      return finish(collected, 'partial', interruption === 'hidden' ? 'paused' : 'blocked')
    }

    if (afterScroll) {
      if (collected.size > sizeBeforeScroll) {
        idleScrolls = 0
      } else if (lastSignal === 'settled') {
        const decision = decideIdleScroll(reader.readHeaderCount(), collected.size, idleScrolls, options)
        idleScrolls = decision.idleScrolls
        if (decision.type === 'complete') return finish(collected, 'complete', 'done')
        if (decision.type === 'estimated') return finish(collected, 'estimated', 'done')
      }
    }

    await options.sleep(options.delayMs)
    const paused = reader.poll()
    if (paused !== 'ok') {
      return finish(collected, 'partial', paused === 'hidden' ? 'paused' : 'blocked')
    }

    sizeBeforeScroll = collected.size
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

function decideIdleScroll(
  header: CountReading | null,
  size: number,
  idleScrolls: number,
  options: CollectOptions,
): Decision {
  if (header?.kind === 'exact' && size >= header.value) {
    return { type: 'complete', idleScrolls }
  }

  const nextIdle = idleScrolls + 1
  if (nextIdle >= options.settleStrikes) {
    return { type: 'estimated', idleScrolls: nextIdle }
  }
  return { type: 'continue', idleScrolls: nextIdle }
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
