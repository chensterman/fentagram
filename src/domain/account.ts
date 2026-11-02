export interface Account {
  username: string
  href: string
}

export function account(username: string, href?: string): Account {
  return {
    username,
    href: href ?? `https://www.instagram.com/${username}/`,
  }
}

export function accountKey(username: string): string {
  return username.trim().toLowerCase()
}
