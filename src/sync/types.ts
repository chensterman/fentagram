import type { Account } from '../domain/account.ts'
import type { CountReading } from '../domain/count.ts'

export type PageSignal = 'grew' | 'settled' | 'blocked' | 'hidden'

export interface ListReader {
  readAccounts(): Account[]
  readHeaderCount(): CountReading | null
  scrollToEnd(): void
  waitForPage(): Promise<PageSignal>
  poll(): 'ok' | 'hidden' | 'blocked'
}

export interface CollectOptions {
  delayMs: number
  settleStrikes: number
  maxSteps: number
  sleep: (ms: number) => Promise<void>
  onProgress?: (update: { accounts: Account[] }) => void
}

export const productionCollectOptions: CollectOptions = {
  delayMs: 800,
  settleStrikes: 3,
  maxSteps: 10_000,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}
