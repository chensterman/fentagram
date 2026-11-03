import en from '../../_locales/en/messages.json'

type Catalog = Record<string, { message: string }>

const fallback = en as Catalog

export function t(name: string, substitutions?: string | string[]): string {
  const subs = substitutions === undefined ? undefined : Array.isArray(substitutions) ? substitutions : [substitutions]
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    const message = chrome.i18n.getMessage(name, subs)
    if (message) return message
  }
  const template = fallback[name]?.message
  if (!template) return name
  if (!subs?.length) return template
  return template.replace(/\$(\d+)\$/g, (_, index: string) => subs[Number(index) - 1] ?? '')
}

export function listLabel(list: 'followers' | 'following'): string {
  return list === 'following' ? t('listFollowing') : t('listFollowers')
}
