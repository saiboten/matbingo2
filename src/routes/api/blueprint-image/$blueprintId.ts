import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../../lib/prisma'
import { safeImageMimeType } from '../../../lib/recipe-image'

const YEAR = 60 * 60 * 24 * 365

export const Route = createFileRoute('/api/blueprint-image/$blueprintId')({
  server: {
    handlers: {
      // One blueprint's photo as an actual image, cached like recipe photos (see api/recipe-image)
      GET: async ({ request, params }) => {
        const image = await prisma.blueprintImage.findUnique({
          where: { blueprintId: params.blueprintId },
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
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox"
          }
        })
      }
    }
  }
})
