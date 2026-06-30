// Embeds text with OpenAI's `text-embedding-3-small` (1536-dim) via OpenRouter.
//
// The same function is used at ingest time (script) and at query time (server
// route), so both sides share an identical vector space — a hard requirement
// for cosine search to mean anything.

export const EMBED_MODEL = 'openai/text-embedding-3-small'
export const EMBED_DIM = 1536

const ENDPOINT = 'https://openrouter.ai/api/v1/embeddings'

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to .env.local (see .env.example).'
    )
  }
  return key
}

// Embed a batch of strings in one request. OpenAI returns vectors in input
// order; we preserve that so callers can zip them back to their source rows.
export async function embedBatch(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return []
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Embeddings request failed (${res.status}): ${body}`)
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] }
  return json.data.map((d) => d.embedding)
}

export async function embedOne(input: string): Promise<number[]> {
  const [vec] = await embedBatch([input])
  return vec
}
