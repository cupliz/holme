// Thin Qdrant HTTP client (no SDK dependency). Used by the ingest script to
// create + populate the `homegoods` collection, and by the AI search route to
// query it. Point IDs mirror the product `id`, so a Qdrant hit maps straight
// back to a normalized Product by id.

import { EMBED_DIM } from './embed'

export const QDRANT_URL =
  process.env.QDRANT_URL ?? 'http://keiko.otka.ai:6336'
export const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ?? 'homegoods'

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  // Optional — only set when the cluster requires it.
  if (process.env.QDRANT_API_KEY) h['api-key'] = process.env.QDRANT_API_KEY
  return h
}

async function call(path: string, method: string, body?: unknown) {
  const res = await fetch(`${QDRANT_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    // Qdrant data is independent of Next's fetch cache; never cache it.
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `Qdrant ${method} ${path} failed (${res.status}): ${JSON.stringify(json)}`
    )
  }
  return json
}

export async function collectionExists(): Promise<boolean> {
  const res = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`, {
    headers: headers(),
    cache: 'no-store',
  })
  return res.ok
}

// Create the collection fresh (drops any existing one) with a cosine 1536-dim
// vector config matching the embedding model.
export async function recreateCollection(): Promise<void> {
  await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`, {
    method: 'DELETE',
    headers: headers(),
    cache: 'no-store',
  })
  await call(`/collections/${QDRANT_COLLECTION}`, 'PUT', {
    vectors: { size: EMBED_DIM, distance: 'Cosine' },
  })
}

export type QdrantPoint = {
  id: number
  vector: number[]
  payload: Record<string, unknown>
}

export async function upsertPoints(points: QdrantPoint[]): Promise<void> {
  await call(`/collections/${QDRANT_COLLECTION}/points?wait=true`, 'PUT', {
    points,
  })
}

export type QdrantHit = { id: number; score: number }

// Semantic search: returns top-`limit` point ids ranked by cosine score. We
// don't pull payloads back here — the server already holds the full Product
// list in memory and looks them up by id, which keeps the response small.
export async function searchVectors(
  vector: number[],
  limit: number
): Promise<QdrantHit[]> {
  const json = (await call(
    `/collections/${QDRANT_COLLECTION}/points/search`,
    'POST',
    { vector, limit, with_payload: false }
  )) as { result: { id: number; score: number }[] }
  return json.result.map((r) => ({ id: r.id, score: r.score }))
}
