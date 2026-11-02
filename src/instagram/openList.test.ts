// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { findCountLink, findProfileLink, openList } from './openList.ts'

describe('openList', () => {
  test('clicks the followers count and waits for the dialog', async () => {
    document.body.innerHTML = `
      <a href="#">206 followers</a>
      <a href="#">59 following</a>
      <a href="#">12.4K followers</a>
    `
    const followers = findCountLink(document, 'followers')
    const following = findCountLink(document, 'following')
    expect(followers?.textContent).toBe('206 followers')
    expect(following?.textContent).toBe('59 following')

    followers?.addEventListener('click', () => {
      document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><h1>Followers</h1></div>')
    })

    await openList(document, 'followers', async () => {})
    expect(document.querySelector('[role="dialog"] h1')?.textContent).toBe('Followers')
  })

  test('opens the profile first when the counts are not on screen', async () => {
    document.body.innerHTML = '<a href="/jingjangly/">Profile</a>'
    expect(findProfileLink(document)?.textContent).toBe('Profile')
    findProfileLink(document)?.addEventListener('click', () => {
      document.body.insertAdjacentHTML('beforeend', '<a href="#">59 following</a>')
    })
    document.addEventListener('click', (event) => {
      const target = event.target
      if (target instanceof HTMLAnchorElement && target.textContent === '59 following') {
        document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><h1>Following</h1></div>')
      }
    })

    await openList(document, 'following', async () => {})
    expect(document.querySelector('h1')?.textContent).toBe('Following')
  })

  test('closes the followers dialog before opening following', async () => {
    document.body.innerHTML = `
      <a href="#">206 followers</a>
      <a href="#">59 following</a>
      <div role="dialog">
        <h1>Followers</h1>
        <button type="button"><div><svg aria-label="Close"></svg></div></button>
      </div>
    `
    const button = document.querySelector('button')
    const handle = button?.querySelector('div')
    button?.addEventListener('click', (event) => event.stopPropagation())
    handle?.addEventListener('click', () => document.querySelector('[role="dialog"]')?.remove())
    document.querySelector('a[href="#"]:nth-of-type(2)')?.addEventListener('click', () => {
      document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><h1>Following</h1></div>')
    })

    await openList(document, 'following', async () => {})
    expect(document.querySelector('[role="dialog"] h1')?.textContent).toBe('Following')
  })
})
