// One-time ingestion: fetch the 4,000 home goods, embed each with OpenAI, and
// upsert into the Qdrant `homegoods` collection (created fresh here).
//
// Run from the project root with bun (loads .env.local automatically):
//
//   bun run ingest
//
// Re-running is safe: it recreates the collection and re-upserts everything.

import { fetchProducts, type Product } from '../lib/products'
import { embedBatch } from '../lib/embed'
import {
  recreateCollection,
  upsertPoints,
  QDRANT_COLLECTION,
  QDRANT_URL,
  type QdrantPoint,
} from '../lib/qdrant'

// The text we embed per product. Mirrors the keyword-search fields so semantic
// and keyword results are drawn from the same signal, just ranked differently.
function embedText(p: Product): string {
  return [
    p.title,
    p.brand,
    p.category,
    p.tags.join(' '),
    p.description ?? '',
  ]
    .filter(Boolean)
    .join('. ')
}

// Payload kept on each point for debuggability / future filtering. Search
// itself maps ids back to in-memory Products, so this is not on the hot path.
function payload(p: Product): Record<string, unknown> {
  return {
    title: p.title,
    brand: p.brand,
    category: p.category,
    tags: p.tags,
    inStock: p.inStock,
  }
}

const EMBED_BATCH = 128 // OpenAI accepts large batches; 128 keeps requests modest
const UPSERT_BATCH = 256

async function main() {
  console.log(`Fetching products…`)
  const products = await fetchProducts()
  console.log(`  ${products.length} products`)

  console.log(`Recreating collection "${QDRANT_COLLECTION}" at ${QDRANT_URL}…`)
  await recreateCollection()

  console.log(`Embedding + upserting…`)
  const points: QdrantPoint[] = []
  for (let i = 0; i < products.length; i += EMBED_BATCH) {
    const slice = products.slice(i, i + EMBED_BATCH)
    const vectors = await embedBatch(slice.map(embedText))
    slice.forEach((p, j) => {
      points.push({ id: p.id, vector: vectors[j], payload: payload(p) })
    })
    process.stdout.write(`  embedded ${Math.min(i + EMBED_BATCH, products.length)}/${products.length}\r`)
  }
  console.log()

  for (let i = 0; i < points.length; i += UPSERT_BATCH) {
    await upsertPoints(points.slice(i, i + UPSERT_BATCH))
    process.stdout.write(`  upserted ${Math.min(i + UPSERT_BATCH, points.length)}/${points.length}\r`)
  }
  console.log(`\nDone. ${points.length} points in "${QDRANT_COLLECTION}".`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
