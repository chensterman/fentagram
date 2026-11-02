// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { profileOwner, profilePlace } from './ownProfile.ts'

describe('profilePlace', () => {
  test('recognizes your own profile from Edit profile', () => {
    document.body.innerHTML = '<main><a href="/accounts/edit/">Edit profile</a></main>'
    expect(profilePlace(document, '/jingjangly/', null)).toBe('own')
    expect(profileOwner('/jingjangly/')).toBe('jingjangly')
  })

  test('treats someone else as another profile', () => {
    document.body.innerHTML = '<main><button>Follow</button><button>Message</button></main>'
    expect(profilePlace(document, '/someone/', null)).toBe('other')
  })

  test('waits while a profile header is still loading', () => {
    document.body.innerHTML = '<main></main>'
    expect(profilePlace(document, '/jingjangly/', null)).toBe('loading')
  })

  test('keeps the followers dialog on your profile', () => {
    document.body.innerHTML = '<main></main>'
    expect(profilePlace(document, '/jingjangly/followers/', 'jingjangly')).toBe('own')
  })

  test('leaves home, reels, and posts', () => {
    expect(profilePlace(document, '/explore/', 'jingjangly')).toBe('other')
    expect(profilePlace(document, '/jingjangly/reels/', 'jingjangly')).toBe('other')
  })
})
