// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { createSnapshot } from '../domain/snapshot.ts'
import { markOpenList } from '../instagram/readList.ts'
import { createDomListReader } from '../instagram/readList.ts'
import { openList } from '../instagram/openList.ts'
import { FakeList, pageOf } from '../sync/fakeList.ts'
import { runSync } from '../sync/runSync.ts'
import type { CollectOptions } from '../sync/types.ts'
import { parseCount } from '../domain/count.ts'

const fastOptions: CollectOptions = {
  delayMs: 0,
  settleStrikes: 3,
  maxSteps: 100,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

function mountProfileWithPaginatedFollowers(): Document {
  document.documentElement.innerHTML = `
    <html lang="en"><body data-owner="demo">
      <main>
        <a href="/demo/followers/">100 followers</a>
        <a href="/demo/following/">2 following</a>
      </main>
    </body></html>
  `
  Object.defineProperty(document, 'location', { value: { pathname: '/demo/' }, configurable: true })

  document.querySelector('a[href="/demo/followers/"]')?.addEventListener('click', (event) => {
    event.preventDefault()
    document.querySelector('[role="dialog"]')?.remove()
    const links = pageOf(0, 12, 'fan')
      .map((item) => `<a class="notranslate" href="/${item.username}/">${item.username}</a>`)
      .join('')
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div role="dialog"><h1>Followers</h1><div id="list" style="overflow-y:scroll;height:120px">${links}</div><button type="button"><svg aria-label="Close"></svg></button></div>`,
    )
    const list = document.getElementById('list')
    if (!(list instanceof HTMLElement)) return
    Object.defineProperty(list, 'scrollHeight', { configurable: true, get: () => 800 })
    Object.defineProperty(list, 'clientHeight', { configurable: true, get: () => 120 })
  })

  document.querySelector('a[href="/demo/following/"]')?.addEventListener('click', (event) => {
    event.preventDefault()
    document.querySelector('[role="dialog"]')?.remove()
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div role="dialog"><h1>Following</h1><div style="overflow-y:scroll;height:120px"><a class="notranslate" href="/follow0/">follow0</a><a class="notranslate" href="/follow1/">follow1</a></div><button type="button"><svg aria-label="Close"></svg></button></div>`,
    )
  })

  document.body.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('[aria-label="Close"], [aria-label="Fechar"], button')) {
      document.querySelector('[role="dialog"]')?.remove()
    }
  })

  return document
}

function exact(value: number) {
  const reading = parseCount(String(value))
  if (!reading) throw new Error('expected a count')
  return reading
}

describe('sync idle-scroll E2E', () => {
  test('runSync advances to following when the DOM list stops growing below the header count', async () => {
    const doc = mountProfileWithPaginatedFollowers()
    markOpenList(null)

    const followingList = new FakeList([pageOf(0, 2, 'follow')], exact(2))

    const result = await runSync(
      createSnapshot('e2e-idle', '2026-11-02T00:00:00.000Z'),
      {
        followers: createDomListReader(doc, 'followers', 'demo'),
        following: followingList,
      },
      fastOptions,
      () => '2026-11-02T00:05:00.000Z',
      {
        beforeList: async (list) => {
          await openList(doc, list, async () => {})
        },
      },
    )

    expect(result.followersStatus).toBe('estimated')
    expect(result.followers).toHaveLength(12)
    expect(result.phase).toBe('done')
    expect(result.followingStatus).toBe('complete')
    expect(result.following).toHaveLength(2)
  }, 120_000)

  test('runSync advances past followers when FakeList stops growing below an exact header', async () => {
    const pages = [pageOf(0, 12), pageOf(12, 12)]
    const followers = new FakeList(pages, exact(100))
    const following = new FakeList([pageOf(0, 2, 'follow')], exact(2))

    const result = await runSync(
      createSnapshot('e2e-fake', '2026-11-02T00:00:00.000Z'),
      { followers, following },
      fastOptions,
      () => '2026-11-02T00:05:00.000Z',
    )

    expect(result.followersStatus).toBe('estimated')
    expect(result.followers).toHaveLength(24)
    expect(result.phase).toBe('done')
    expect(result.stopReason).toBe('done')
  })
})
