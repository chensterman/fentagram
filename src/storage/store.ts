import type { Snapshot } from '../domain/snapshot.ts'
import { isFinished } from '../domain/snapshot.ts'

export interface SnapshotStore {
  save(snapshot: Snapshot): Promise<void>
  get(id: string): Promise<Snapshot | null>
  list(): Promise<Snapshot[]>
}

export class MemoryStore implements SnapshotStore {
  private readonly snapshots = new Map<string, Snapshot>()

  async save(snapshot: Snapshot): Promise<void> {
    this.snapshots.set(snapshot.id, structuredClone(snapshot))
  }

  async get(id: string): Promise<Snapshot | null> {
    const snapshot = this.snapshots.get(id)
    return snapshot ? structuredClone(snapshot) : null
  }

  async list(): Promise<Snapshot[]> {
    return [...this.snapshots.values()]
      .map((snapshot) => structuredClone(snapshot))
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  }
}

export function previousComplete(snapshots: Snapshot[], currentId: string): Snapshot | null {
  const finished = snapshots
    .filter((snapshot) => snapshot.id !== currentId && isFinished(snapshot))
    .sort((a, b) => (a.finishedAt ?? '').localeCompare(b.finishedAt ?? ''))
  return finished.at(-1) ?? null
}
