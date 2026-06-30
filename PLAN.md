# Product Discovery Page — Build Plan

## Task
Build a small product discovery page for ~4,000 home goods products from:
`https://media.downshift.app/hiring/founding-engineer/items.json`

One Next.js app, two routes, shared everything except search logic:
- **`/search`** — keyword search (Fuse.js), instant, no API calls
- **`/ai-search`** — semantic search (embeddings), intent-aware, AI-powered

Nav link in header switches between them so the difference is immediately apparent.

---

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Fuse.js (/search — keyword)
- OpenAI `text-embedding-3-small` (1536-dim) for embeddings (/ai-search only)
- Qdrant vector DB (`homegoods` collection) for semantic retrieval
- No build-time vector files — products embedded once into Qdrant via a script;
  queries embedded server-side per request

> **Correction to the original plan:** OpenRouter does **not** expose an
> `/embeddings` endpoint, so embeddings come straight from the OpenAI API
> (`OPENAI_API_KEY`). Vectors live in **Qdrant** (`http://keiko.otka.ai:6336`,
> collection `homegoods`), not a client-side `embeddings.json`. Cosine ranking
> happens in Qdrant, not in the browser.

---

## Data Audit (items.json — 4,000 items)

### Inconsistencies to normalize
| Field | Issue | Fix |
|-------|-------|-----|
| `price` | `number`, `string` (with/without comma), `null`, `0` | Strip commas, `parseFloat`, treat `null`/`0` as unavailable |
| `title` | 16 items have leading/trailing whitespace + ALL CAPS | `.trim()` + title-case |
| `rating` | `null` on 205 items | Show "No ratings yet" in UI |
| `description` | `null` on 207 items | Skip snippet in card |
| `image` | `null` on 183 items (imageWidth/Height also null) | Show placeholder |

### Clean fields (no action needed)
`id`, `brand`, `category`, `tags`, `inStock`, `releasedAt`, `reviews`

### Normalized Product type
```ts
type Product = {
  id: number
  title: string           // trimmed, title-cased
  brand: string
  category: string
  tags: string[]
  price: number | null    // null = unavailable; 0 treated as null
  rating: number | null
  reviews: number         // 0 = new product, valid
  inStock: boolean
  releasedAt: string      // ISO date
  image: string | null
  imageWidth: number | null
  imageHeight: number | null
  description: string | null
}
```

---

## File Structure

```
/
  scripts/
    ingest-qdrant.ts             — one-time: fetch items.json, embed all (OpenAI), upsert into Qdrant

  lib/
    products.ts                  — normalize(), toTitleCase(), Product type, fetchProducts()
    keyword-search.ts            — Fuse index + applyFilters()/applySort() (exported, shared)
    embed.ts                     — embedBatch()/embedOne() via OpenAI (shared ingest + query)
    qdrant.ts                    — Qdrant HTTP client: recreateCollection, upsertPoints, searchVectors
    search-server.ts             — keyword: cached products + Fuse, runSearch()
    ai-search-server.ts          — semantic: cached products + id map, runAiSearch()

  app/
    layout.tsx                   — shared shell, renders <NavHeader/>
    page.tsx                     — redirect to /search

    search/
      page.tsx                   — server: initial results → SearchClient
      SearchClient.tsx           — 'use client': keyword search via /api/search

    ai-search/
      page.tsx                   — server: initial catalog → AiSearchClient
      AiSearchClient.tsx         — 'use client': semantic search via /api/ai-search

    api/
      search/route.ts            — GET → runSearch (keyword)
      ai-search/route.ts         — GET → runAiSearch (embed query + Qdrant)

  components/
    FilterBar.tsx                — shared category pills, inStock toggle, price range, min rating
    ProductGrid.tsx              — shared results grid with sort controls
    ProductCard.tsx              — shared card (image, title, brand, price, rating, badges)
    RatingStars.tsx              — shared star display
    NavHeader.tsx                — 'use client': logo + /search vs /ai-search active tabs

  .env.example                   — OPENAI_API_KEY, QDRANT_URL, QDRANT_COLLECTION
```

Vectors live in Qdrant (`homegoods`), not a committed file.

---

## `/search` — Keyword Route

### How it works
- Fuse.js indexes `title`, `brand`, `category`, `tags`, `description` in-memory
- Debounced input (150ms) → results update instantly
- Exact title substring match boosted to top
- Matched terms highlighted in card titles

### UX flow
1. Page loads → products indexed in Fuse.js instantly
2. User types → results filter live, no network call
3. Filter pills + sort refine the set

---

## `/ai-search` — Semantic Route

### Embedding strategy

**Ingest (run once — `scripts/ingest-qdrant.ts`, `bun run ingest`)**
- Fetch the 4,000 items, normalize, build one text blob per product:
  `title. brand. category. tags. description`
- Embed in batches with OpenAI `text-embedding-3-small` (1536-dim)
- Recreate the Qdrant `homegoods` collection (cosine, 1536) and upsert each
  product as a point whose **id == product id** (so a hit maps straight back
  to the in-memory Product)
- Re-runnable: recreates the collection and re-upserts every time

**Query-time (`/api/ai-search` → `lib/ai-search-server.ts`)**
- Product list fetched once per server instance and cached (id → Product map)
- Per request: embed the query string (one sentence) → Qdrant vector search
  (`TOP_K=120`) → map returned ids back to Products → apply shared
  filters/sort. Empty query = full catalog, no embedding call.
- Whole query is embedded as a **phrase/sentence**, matched by meaning — not
  per character. The 600ms debounce waits for the phrase to settle first.

### UX flow
1. User types a phrase ("cozy furniture", "modern kitchen table")
2. 600ms debounce → GET `/api/ai-search?q=…` (embed + Qdrant, server-side)
3. Grid dims (`pending`) during the round-trip, then re-ranks by semantic score
4. Label: "24 semantic matches for 'cozy furniture'"
5. Errors (e.g. missing key) surface in a red banner, grid keeps last results

### Why it feels different from /search
- "cozy bedroom" → Textiles, Lighting, Decor by intent, zero keyword overlap
- "something to hold my keys" → Tray, Bowl, Hook, Organizer surface naturally
- "Rattan" still wins on /search via exact match; /ai-search agrees but also finds related wicker/natural-fiber items

---

## Shared UI

### Layout
- Sticky header: logo left, "Keyword Search / AI Search" tab toggle right
- Hero search bar centered, large, with placeholder text that differs per route
  - `/search`: "Search 4,000 home goods…"
  - `/ai-search`: "Describe what you're looking for…"
- Filter bar below search: category pills (10), inStock toggle, price range slider, min rating stars
- Results grid: 4 columns desktop, 2 tablet, 1 mobile
- Sort dropdown: Relevance / Price: Low→High / Price: High→Low / Rating / Newest

### Product card
- Image with fixed aspect ratio + skeleton loader; gray placeholder when `image` is null
- Title (title-cased), brand (muted), category pill
- Price (formatted `$1,234.56`) or "Price unavailable" when null
- Star rating + review count; "No ratings yet" when null
- "In Stock" green badge or "Out of Stock" muted badge
- Hover: card lifts + quick-view drawer slides up with full description + tags

### 10 Categories
Bath, Decor, Furniture, Kitchen, Lighting, Office, Outdoor, Storage, Textiles, Wall Art

---

## Running it
1. `cp .env.example .env.local` and set `OPENAI_API_KEY` (Qdrant defaults are
   already correct for `keiko.otka.ai`).
2. `bun run ingest` — embeds 4,000 products into the Qdrant `homegoods`
   collection (recreates it). One-time; re-run to refresh.
3. `bun run dev` — `/search` (keyword) and `/ai-search` (semantic) both live.

Without step 2 the collection exists but is empty, so `/ai-search` returns no
semantic matches. Without `OPENAI_API_KEY`, `/api/ai-search` returns a 500 that
the client surfaces as a red banner.
