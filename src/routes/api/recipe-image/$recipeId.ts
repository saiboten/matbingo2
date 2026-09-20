import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../../lib/prisma'
import { safeImageMimeType } from '../../../lib/recipe-image'

const YEAR = 60 * 60 * 24 * 365

export const Route = createFileRoute('/api/recipe-image/$recipeId')({
  server: {
    handlers: {
      // One recipe's photo as an actual image. The URL carries a version (?v=), so a versioned
      // response can be cached for good, in the browser and on the CDN, and the database is
      // only read the first time a photo is shown.
      GET: async ({ request, params }) => {
        const image = await prisma.recipeImage.findUnique({
          where: { recipeId: params.recipeId },
          select: { base64: true, mimeType: true }
        })

        if (!image) {
          return new Response('Fant ikke bildet', { status: 404, headers: { 'Cache-Control': 'no-store' } })
        }

        const versioned = new URL(request.url).searchParams.has('v')

        return new Response(new Uint8Array(Buffer.from(image.base64, 'base64')), {
          headers: {
            'Content-Type': safeImageMimeType(image.mimeType) ?? 'application/octet-stream',
            'Cache-Control': versioned
              ? `public, max-age=${YEAR}, s-maxage=${YEAR}, immutable`
              : 'public, max-age=300, stale-while-revalidate=3600',
            // Never let the browser reinterpret stored data as a page or a script
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox"
          }
        })
      }
    }
  }
})
