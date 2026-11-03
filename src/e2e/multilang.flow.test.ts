// @vitest-environment happy-dom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, test } from 'vitest'
import { runFlow } from '../../e2e/harness.ts'

function loadFixture(name: string): { document: Document; owner: string; locale: string } {
  const html = readFileSync(resolve(`e2e/fixtures/${name}`), 'utf8')
  document.documentElement.innerHTML = html
  const owner = document.body.dataset.owner ?? ''
  const locale = document.documentElement.lang || 'unknown'
  for (const script of [...document.querySelectorAll('script[type="module"]')]) {
    if (script.getAttribute('src')?.includes('harness')) script.remove()
  }
  const inline = html.match(/<script type="module">\s*([\s\S]*?)<\/script>/g)
  for (const block of inline ?? []) {
    const body = block.replace(/<\/?script[^>]*>/g, '')
    if (body.includes('addEventListener')) {
      // eslint-disable-next-line no-new-func
      new Function(body)()
    }
  }
  return { document, owner, locale }
}

describe('multilang E2E flow', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '<head></head><body></body>'
  })

  test('English profile fixture', async () => {
    const { document: doc, owner, locale } = loadFixture('en-profile.html')
    const result = await runFlow(doc, owner, locale)
    expect(result.errors, result.errors.join('; ')).toEqual([])
    expect(result.checks).toContain('profilePlace:own')
    expect(result.checks).toContain('openList:following')
  })

  test('Portuguese profile fixture', async () => {
    const { document: doc, owner, locale } = loadFixture('pt-profile.html')
    const result = await runFlow(doc, owner, locale)
    expect(result.errors, result.errors.join('; ')).toEqual([])
    expect(result.checks).toContain('profileNav')
    expect(result.checks).toContain('openList:followers')
  })
})
