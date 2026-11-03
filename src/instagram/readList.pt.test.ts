// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { findCountLink, findDialog, markOpenList, readHeaderCount } from './readList.ts'

describe('readList (Portuguese UI)', () => {
  test('reads counts and dialogs with localized labels', () => {
    document.body.innerHTML = `
      <a href="/ada/followers/">1.270 seguidores</a>
      <a href="/ada/following/">59 seguindo</a>
      <div role="dialog">
        <h1>Seguindo</h1>
        <div style="overflow-y: scroll"><a href="/bea/">bea</a></div>
      </div>
    `
    markOpenList('following')
    expect(readHeaderCount(document, 'following', 'ada')).toMatchObject({ kind: 'exact', value: 59 })
    expect(findCountLink(document, 'followers', 'ada')).toBeTruthy()
    expect(findDialog(document, 'following')).toBeTruthy()
  })
})
