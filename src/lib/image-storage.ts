import { put, del, copy } from '@vercel/blob'
import { safeImageMimeType } from './recipe-image'

// Photos are stored in Vercel Blob (public, served from Vercel's CDN); the database only keeps the
// link. This is the one place that talks to Blob, so everything else can be tested with a fake.

export class ImageStorageError extends Error {}

export interface BlobClient {
  put: (
    pathname: string,
    body: Buffer,
    options: { access: 'public'; contentType: string; addRandomSuffix: boolean; cacheControlMaxAge: number }
  ) => Promise<{ url: string }>
  del: (url: string) => Promise<void>
  copy: (
    fromUrl: string,
    toPathname: string,
    options: { access: 'public'; addRandomSuffix: boolean; cacheControlMaxAge?: number }
  ) => Promise<{ url: string }>
}

const YEAR = 60 * 60 * 24 * 365

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
}

// The real client, which needs BLOB_READ_WRITE_TOKEN (set by Vercel, and in .env.dev / .env.prod locally)
function defaultClient(): BlobClient {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ImageStorageError('Bildelagring er ikke satt opp (BLOB_READ_WRITE_TOKEN mangler)')
  }
  return {
    put: (pathname, body, options) => put(pathname, body, options),
    del: (url) => del(url),
    copy: (fromUrl, toPathname, options) => copy(fromUrl, toPathname, options)
  }
}

// Only links to Blob are ours to delete or copy; old `/api/...-image` links and foreign URLs are not
export function isBlobUrl(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:' && hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

// Uploads a photo (base64, as the forms send it) and returns its public link
export async function storeImage(
  image: { base64: string; mimeType: string },
  folder: 'recipes' | 'blueprints',
  client?: BlobClient
): Promise<string> {
  const mimeType = safeImageMimeType(image.mimeType)
  if (!mimeType) throw new ImageStorageError('Ugyldig bilde')

  const blob = client ?? defaultClient()
  const result = await blob.put(`${folder}/photo.${EXTENSIONS[mimeType]}`, Buffer.from(image.base64, 'base64'), {
    access: 'public',
    contentType: mimeType,
    // A new address for every upload, so a replaced photo is never served stale from the CDN
    addRandomSuffix: true,
    cacheControlMaxAge: YEAR
  })
  return result.url
}

// Gives a copy its own file, so deleting or replacing one photo never breaks the other
export async function copyImage(url: string, folder: 'recipes' | 'blueprints', client?: BlobClient): Promise<string> {
  if (!isBlobUrl(url)) throw new ImageStorageError('Kan bare kopiere bilder fra bildelagringen')
  const blob = client ?? defaultClient()
  const extension = new URL(url).pathname.split('.').pop() || 'jpg'
  const result = await blob.copy(url, `${folder}/photo.${extension}`, {
    access: 'public',
    addRandomSuffix: true,
    cacheControlMaxAge: YEAR
  })
  return result.url
}

// Removes a photo that is no longer used. Best effort: a failure is logged, never thrown, since the
// database change it belongs to has already succeeded.
export async function deleteImage(url: string | null | undefined, client?: BlobClient): Promise<void> {
  if (!isBlobUrl(url)) return
  try {
    await (client ?? defaultClient()).del(url)
  } catch (error) {
    console.error('Could not delete image', url, error)
  }
}
