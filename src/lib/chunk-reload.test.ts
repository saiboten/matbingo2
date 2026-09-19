import { describe, expect, it } from 'vitest'
import { isChunkLoadError } from './chunk-reload'

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://matbingo2.vercel.app/assets/index-CvX9pY3P.js',
    'Importing a module script failed.',
    'Loading chunk 12 failed.',
    'Unable to preload CSS for /assets/index.css',
  ])('recognises %s', message => {
    expect(isChunkLoadError(new Error(message))).toBe(true)
  })

  it('ignores ordinary errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })
})
