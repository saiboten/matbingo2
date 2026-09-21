import { describe, expect, it, vi } from 'vitest'
import { ImageStorageError, copyImage, deleteImage, isBlobUrl, storeImage, type BlobClient } from './image-storage'

const LINK = 'https://store1.public.blob.vercel-storage.com/recipes/photo-abc123.png'

function fakeClient() {
  return {
    put: vi.fn().mockResolvedValue({ url: LINK }),
    del: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue({ url: 'https://store1.public.blob.vercel-storage.com/blueprints/photo-def456.png' })
  } satisfies BlobClient
}

describe('isBlobUrl', () => {
  it('only accepts https links to Vercel Blob', () => {
    expect(isBlobUrl(LINK)).toBe(true)
    const others = [null, undefined, '', '/api/recipe-image/1?v=2', 'http://a.public.blob.vercel-storage.com/x.png', 'https://evil.example.com/x.png', 'https://blob.vercel-storage.com.evil.com/x', 'not a url']
    for (const other of others) expect(isBlobUrl(other)).toBe(false)
  })
})

describe('storeImage', () => {
  it('uploads the decoded bytes as a public file with a random suffix and returns the link', async () => {
    const client = fakeClient()
    const url = await storeImage({ base64: Buffer.from('hello').toString('base64'), mimeType: 'IMAGE/PNG' }, 'recipes', client)

    expect(url).toBe(LINK)
    const [pathname, body, options] = client.put.mock.calls[0]
    expect(pathname).toBe('recipes/photo.png')
    expect(Buffer.from(body).toString()).toBe('hello')
    expect(options).toMatchObject({ access: 'public', contentType: 'image/png', addRandomSuffix: true })
    expect(options.cacheControlMaxAge).toBeGreaterThan(60 * 60 * 24 * 300)
  })

  it('refuses anything that is not a known image type, without uploading', async () => {
    const client = fakeClient()
    await expect(storeImage({ base64: 'AAAA', mimeType: 'text/html' }, 'recipes', client)).rejects.toBeInstanceOf(ImageStorageError)
    expect(client.put).not.toHaveBeenCalled()
  })

  it('explains what is missing when the storage is not set up', async () => {
    const saved = process.env.BLOB_READ_WRITE_TOKEN
    delete process.env.BLOB_READ_WRITE_TOKEN
    try {
      await expect(storeImage({ base64: 'AAAA', mimeType: 'image/png' }, 'recipes')).rejects.toThrow('BLOB_READ_WRITE_TOKEN')
    } finally {
      if (saved !== undefined) process.env.BLOB_READ_WRITE_TOKEN = saved
    }
  })
})

describe('copyImage', () => {
  it('gives the copy its own file', async () => {
    const client = fakeClient()
    const copy = await copyImage(LINK, 'blueprints', client)
    expect(copy).not.toBe(LINK)
    expect(client.copy).toHaveBeenCalledWith(LINK, 'blueprints/photo.png', expect.objectContaining({ access: 'public', addRandomSuffix: true }))
  })

  it('only copies files from the storage', async () => {
    await expect(copyImage('https://evil.example.com/x.png', 'recipes', fakeClient())).rejects.toBeInstanceOf(ImageStorageError)
  })
})

describe('deleteImage', () => {
  it('deletes a stored file', async () => {
    const client = fakeClient()
    await deleteImage(LINK, client)
    expect(client.del).toHaveBeenCalledWith(LINK)
  })

  it('leaves old endpoint links, foreign links and nothing alone', async () => {
    const client = fakeClient()
    for (const other of ['/api/recipe-image/1', 'https://evil.example.com/x.png', null, undefined]) await deleteImage(other, client)
    expect(client.del).not.toHaveBeenCalled()
  })

  it('never throws when the deletion fails', async () => {
    const client = fakeClient()
    client.del.mockRejectedValue(new Error('boom'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(deleteImage(LINK, client)).resolves.toBeUndefined()
    log.mockRestore()
  })
})
