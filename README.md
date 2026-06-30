# Holme

A product discovery page for ~4,000 home goods. Keyword search with live filtering and sorting, built on Next.js (App Router) + TypeScript + Tailwind CSS.

The catalog (`items.json`) is fetched from a remote source, normalized, and indexed with [Fuse.js](https://www.fusejs.io/) for fuzzy matching across title, brand, category, tags, and description.

## Status

- **`/search`** — keyword search, filters, and sort. Built and working.
- **`/ai-search`** — semantic search. Stubbed in the nav as "Coming soon"; not implemented.

> `PLAN.md` describes a broader two-route design (including a semantic `/ai-search` powered by embeddings via OpenRouter). That route is not built. This README documents what currently exists in the code.

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on **port 3005** (`next dev --port 3005`). Open http://localhost:3005 — `/` redirects to `/search`.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

No environment variables or API keys are required.

## How it works

### Data pipeline (`lib/products.ts`)

`fetchProducts()` pulls the catalog from `https://media.downshift.app/hiring/founding-engineer/items.json` (cached with `next: { revalidate: 86400 }`, i.e. revalidated daily) and runs each item through `normalizeProduct()`:

| Field | Normalization |
|-------|---------------|
| `title` | trimmed and title-cased |
| `price` | strips commas, `parseFloat`; `null` and `0` both become `null` (unavailable) |
| `rating` | `null` when missing |
| `description`, `image`, `imageWidth/Height` | `null` when missing |
| `tags` | defaults to `[]` |

The normalized shape is the `Product` type exported from the same file.

### Search (`lib/keyword-search.ts`, `lib/search-server.ts`)

Search runs **server-side**:

1. On the first `/api/search` request per server instance, the product list is fetched, the Fuse index is built, and both are cached at module level (`lib/search-server.ts`). Subsequent queries are in-memory — no re-fetch or re-index per keystroke.
2. `search()` runs the Fuse query (weighted: title 0.4, brand 0.2, category 0.15, tags 0.15, description 0.1; `threshold: 0.35`, `ignoreLocation: true`), pins exact title-substring matches to the top, then applies filters and sort.

Filters: category, in-stock toggle, min/max price, min rating.
Sort: relevance, price ascending/descending, rating, newest.

### API (`app/api/search/route.ts`)

`GET /api/search` reads query and filter state from search params (`q`, `sort`, `category`, `inStock`, `minPrice`, `maxPrice`, `minRating`) and returns `{ results, total, priceRange }`.

### UI (`app/search/`, `components/`)

- `app/search/page.tsx` — server component; renders the initial unfiltered result set so first paint isn't empty.
- `app/search/SearchClient.tsx` — client component; the input updates instantly while queries, filter, and sort changes are **debounced 600ms** before hitting `/api/search`. In-flight requests are aborted when superseded. The grid renders against a `committedQuery` that only changes once results land, so keystrokes don't cascade re-renders.
- `components/` — `FilterBar`, `ProductGrid`, `ProductCard`, `RatingStars`.

The 10 categories: Bath, Decor, Furniture, Kitchen, Lighting, Office, Outdoor, Storage, Textiles, Wall Art.

## Project structure

```
app/
  layout.tsx              shared shell + header nav (Search / AI Search tabs)
  page.tsx                redirects to /search
  search/
    page.tsx              server component, initial render
    SearchClient.tsx      client: debounced fetch, filters, sort
  api/search/route.ts     GET endpoint backed by the cached index
lib/
  products.ts             Product type, normalization, remote fetch
  keyword-search.ts       Fuse index, filters, sort
  search-server.ts        module-level cache + runSearch()
components/                FilterBar, ProductGrid, ProductCard, RatingStars
public/items.json          local copy of the catalog
```

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Tailwind CSS 4
- Fuse.js 7 (fuzzy keyword search)

> See `AGENTS.md` — this project pins a Next.js version whose APIs may differ from older conventions; check `node_modules/next/dist/docs/` before changing framework-level code.
