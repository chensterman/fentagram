import type { CountReading } from '../domain/count.ts'
import { accountKey, type Account } from '../domain/account.ts'
import type { PageSignal } from './types.ts'
import type { ListReader } from './types.ts'

export class FakeList implements ListReader {
  scrolls = 0
  waiting = false
  private page = 0
  private pending: PageSignal = 'settled'
  private holdsRemaining = 0
  private releaseCurrent: (() => void) | null = null
  private forcePoll: 'ok' | 'hidden' | 'blocked' = 'ok'

  constructor(
    private readonly pages: Account[][],
    private readonly header: CountReading,
    private readonly behavior: { hideAfterScrolls?: number; blockAfterScrolls?: number } = {},
  ) {}

  holdNextWait(): void {
    this.holdsRemaining += 1
  }

  release(): void {
    this.releaseCurrent?.()
    this.releaseCurrent = null
  }

  setPoll(value: 'ok' | 'hidden' | 'blocked'): void {
    this.forcePoll = value
  }

  readAccounts(): Account[] {
    return this.pages[Math.min(this.page, Math.max(this.pages.length - 1, 0))] ?? []
  }

  readHeaderCount(): CountReading {
    return this.header
  }

  scrollToEnd(): void {
    this.scrolls += 1
    if (this.behavior.blockAfterScrolls !== undefined && this.scrolls >= this.behavior.blockAfterScrolls) {
      this.pending = 'blocked'
      return
    }
    if (this.behavior.hideAfterScrolls !== undefined && this.scrolls >= this.behavior.hideAfterScrolls) {
      this.pending = 'hidden'
      return
    }
    if (this.page < this.pages.length - 1) {
      this.page += 1
      this.pending = 'grew'
      return
    }
    this.pending = 'settled'
  }

  async waitForPage(): Promise<PageSignal> {
    if (this.holdsRemaining > 0) {
      this.holdsRemaining -= 1
      this.waiting = true
      await new Promise<void>((resolve) => {
        this.releaseCurrent = resolve
      })
      this.waiting = false
    }
    return this.pending
  }

  poll(): 'ok' | 'hidden' | 'blocked' {
    return this.forcePoll
  }
}

export function pageOf(start: number, count: number, prefix = 'user'): Account[] {
  return Array.from({ length: count }, (_, index) => {
    const username = `${prefix}${start + index}`
    return { username, href: `https://www.instagram.com/${username}/` }
  })
}

export function names(accounts: Account[]): string[] {
  return accounts.map((item) => accountKey(item.username)).sort()
}
