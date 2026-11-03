import { build } from 'esbuild'
import { cp, mkdir, rm } from 'node:fs/promises'

await import('./build-locales.mjs')
await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })

await build({
  entryPoints: ['src/extension/content.ts'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
})

await build({
  entryPoints: ['src/extension/panel.ts'],
  bundle: true,
  outfile: 'dist/panel.js',
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
})

await build({
  entryPoints: ['src/extension/background.ts'],
  bundle: true,
  outfile: 'dist/background.js',
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
})

await cp('src/extension/panel.html', 'dist/panel.html')
await cp('src/extension/panel.css', 'dist/panel.css')
await cp('src/extension/manifest.json', 'dist/manifest.json')
await cp('_locales', 'dist/_locales', { recursive: true })
await cp('src/extension/icons', 'dist/icons', { recursive: true })
