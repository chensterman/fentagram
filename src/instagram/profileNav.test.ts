// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { findProfileLink, isProfileNavLink } from './profileNav.ts'

describe('profileNav', () => {
  test('finds the profile link by href when the label is Perfil', () => {
    document.body.innerHTML = '<nav><a href="/ada/">Perfil</a></nav>'
    const link = findProfileLink(document, 'ada')
    expect(link?.getAttribute('href')).toBe('/ada/')
    expect(isProfileNavLink(link!, 'ada')).toBe(true)
  })

  test('matches the English Profile label without a known owner', () => {
    document.body.innerHTML = '<a href="/ada/">Profile</a>'
    const link = document.querySelector('a')!
    expect(isProfileNavLink(link, null)).toBe(true)
  })
})
