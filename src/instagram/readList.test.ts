// @vitest-environment happy-dom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { createDomListReader, findScroller, isListLoading, readAccounts, readHeaderCount } from './readList.ts'

const html = readFileSync(resolve('fixtures/followers-dialog.html'), 'utf8')

function setScrollMetrics(element: HTMLElement | null, scrollHeight: number, clientHeight: number): void {
  if (!element) throw new Error('missing scroll element')
  Object.defineProperty(element, 'scrollHeight', { configurable: true, get: () => scrollHeight })
  Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => clientHeight })
}

function mount(source = html): Document {
  document.body.innerHTML = source
  return document
}

describe('readList', () => {
  test('reads each profile once and skips reserved links', () => {
    const accounts = readAccounts(mount(), 'followers')
    expect(accounts.map((account) => account.username)).toEqual(['ada', 'bea'])
  })

  test('reads nothing when the dialog is closed', () => {
    document.body.innerHTML = '<a class="notranslate" href="/ada/">ada</a>'
    expect(readAccounts(document, 'followers')).toEqual([])
  })

  test('reads the profile header count outside the dialog', () => {
    const root = mount()
    expect(readHeaderCount(root, 'followers')).toMatchObject({ kind: 'exact', value: 206 })
    expect(readHeaderCount(root, 'following')).toMatchObject({ kind: 'exact', value: 59 })
  })

  test('scrolls the overflowing list, not the wrapper around it', () => {
    document.body.innerHTML = `
      <a href="#">206 followers</a>
      <div role="dialog">
        <h1>Followers</h1>
        <div id="outer" style="overflow-y: auto"><a href="/ada/">ada</a></div>
        <div id="list" style="overflow-y: scroll"><a class="notranslate" href="/bea/">bea</a></div>
        <div id="wrap" style="overflow-y: auto"><a href="/cy/">cy</a></div>
      </div>
    `
    const list = document.getElementById('list')
    if (!(list instanceof HTMLElement)) throw new Error('missing list')
    setScrollMetrics(document.getElementById('outer'), 400, 400)
    setScrollMetrics(list, 796, 309)
    setScrollMetrics(document.getElementById('wrap'), 730, 730)

    expect(findScroller(document)?.id).toBe('list')
    createDomListReader(document, 'followers').scrollToEnd()
    expect(list.scrollTop).toBe(796)
  })

  test('sees the loading marker inside the dialog', () => {
    const root = mount()
    expect(isListLoading(root, 'followers')).toBe(true)
    root.querySelector('[role="progressbar"]')?.remove()
    expect(isListLoading(root, 'followers')).toBe(false)
  })
})
