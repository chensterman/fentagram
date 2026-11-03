import { describe, expect, test } from 'vitest'
import { countLinkPattern, DIALOG_TITLES, PROFILE_NAV_LABELS } from './localeUi.ts'

describe('localeUi', () => {
  test('matches common profile nav labels', () => {
    expect(PROFILE_NAV_LABELS.has('Perfil')).toBe(true)
    expect(PROFILE_NAV_LABELS.has('Profil')).toBe(true)
    expect(PROFILE_NAV_LABELS.has('プロフィール')).toBe(true)
  })

  test('matches localized follower count links', () => {
    expect(countLinkPattern('followers').test('1270 seguidores')).toBe(true)
    expect(countLinkPattern('followers').test('1,234 followers')).toBe(true)
    expect(countLinkPattern('following').test('412 seguindo')).toBe(true)
    expect(countLinkPattern('following').test('500 フォロー中')).toBe(true)
  })

  test('includes localized dialog titles', () => {
    expect(DIALOG_TITLES.followers.has('Seguidores')).toBe(true)
    expect(DIALOG_TITLES.following.has('フォロー中')).toBe(true)
  })
})
