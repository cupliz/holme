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
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Fuse.js (both routes — keyword baseline + instant fallback on /ai-search)
- OpenAI `text-embedding-3-small` via OpenRouter (/ai-search only)
- No database — data fetched at build time, vectors loaded client-side

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
    precompute-embeddings.ts     — one-time: fetch items.json, embed all, write public/embeddings.json

  lib/
    products.ts                  — normalize(), toTitleCase(), Product type
    keyword-search.ts            — fuseSearch(), filterProducts(), sortProducts()
    semantic-search.ts           — cosineSimilarity(), semanticSearch(), mergeResults()

  app/
    layout.tsx                   — shared shell with header nav (/search ↔ /ai-search)
    page.tsx                     — redirect to /search

    search/
      page.tsx                   — server component: fetch products → pass to client
      SearchClient.tsx           — 'use client': Fuse.js search + filters + grid

    ai-search/
      page.tsx                   — server component: fetch products → pass to client
      AiSearchClient.tsx         — 'use client': hybrid search, loads embeddings, calls /api/embed
      loading.tsx                — skeleton state while embeddings.json loads

    api/
      embed/
        route.ts                 — POST { query } → vector via OpenRouter (server-side, key hidden)

  components/
    SearchBar.tsx                — shared input with debounce
    FilterBar.tsx                — shared category pills, inStock toggle, price range, min rating
    ProductGrid.tsx              — shared results grid with sort controls
    ProductCard.tsx              — shared card (image, title, brand, price, rating, badges)
    RatingStars.tsx              — shared star display
    NavHeader.tsx                — logo + /search vs /ai-search toggle tabs

  public/
    embeddings.json              — precomputed vectors (committed, served statically)
```

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

**Precompute (run once, output committed)**
- Script: `scripts/precompute-embeddings.ts`
- Text blob: `title + brand + category + tags.join(' ') + description`
- Model: `openai/text-embedding-3-small` via OpenRouter
  - Base URL: `https://openrouter.ai/api/v1`
  - API key stored in `.env.local` as `OPENROUTER_API_KEY`
- Output: `public/embeddings.json` → `{ id: number, vector: number[] }[]`
- Size: ~4000 × 1536 floats ≈ 24MB raw, ~6MB gzip

**Query-time**
- POST query to `/api/embed` → OpenRouter returns query vector
- `Float32Array` cosine similarity across all 4000 vectors in-browser (~5ms)
- Top-N IDs ranked by score, looked up from product map

**Hybrid merge**
- Fuse.js keyword results show instantly while embed call is in flight
- On embed response: semantic top 10 ranked first, keyword-only appended below divider
- Exact title match always pinned to top regardless of cosine score

### UX flow
1. User types → Fuse.js keyword results appear instantly (0ms)
2. 150ms debounce → POST `/api/embed` (~100ms round-trip)
3. Cosine ranking runs in-browser → grid re-ranks smoothly (no layout jump)
4. Badge: "AI" pill on semantic matches, "Keyword" on fallback-only results
5. Label: "24 semantic matches for 'cozy bedroom'"

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

## Build Order
1. `scripts/precompute-embeddings.ts` → run → commit `public/embeddings.json`
2. `lib/products.ts` — normalizer + types
3. `lib/keyword-search.ts` — Fuse.js + filter + sort
4. `components/` — ProductCard, ProductGrid, SearchBar, FilterBar, RatingStars, NavHeader
5. `app/search/` — server page + SearchClient
6. `lib/semantic-search.ts` — cosine + merge
7. `app/api/embed/route.ts` — embed proxy
8. `app/ai-search/` — server page + AiSearchClient
9. `app/layout.tsx` — shared shell
10. Polish: transitions, empty states, loading skeletons, mobile layout
