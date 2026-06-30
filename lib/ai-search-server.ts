import { fetchProducts, Product } from './products'
import { applyFilters, applySort, Filters, SortOption } from './keyword-search'
import { embedOne } from './embed'
import { searchVectors } from './qdrant'

// Server-side semantic search. The product list is fetched once per server
// instance and held in a module-level cache (same pattern as search-server.ts),
// so each request only does: embed the query → Qdrant vector search → map the
// returned ids back to in-memory Products → apply the shared filters/sort.

let cache:
  | Promise<{
      products: Product[]
      byId: Map<number, Product>
      priceRange: { min: number; max: number }
    }>
  | null = null

function load() {
  if (!cache) {
    cache = fetchProducts().then((products) => {
      const byId = new Map(products.map((p) => [p.id, p]))
      const prices = products.filter((p) => p.price !== null).map((p) => p.price as number)
      const priceRange = prices.length
        ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
        : { min: 0, max: 0 }
      return { products, byId, priceRange }
    })
  }
  return cache
}

export type AiSearchResponse = {
  results: Product[]
  total: number
  priceRange: { min: number; max: number }
  semantic: boolean // false when query is empty (no embedding performed)
}

// How many vector hits to pull before filtering. Generous so post-filtering
// (category/price/stock) still leaves a full grid.
const TOP_K = 120

export async function runAiSearch(
  query: string,
  filters: Filters,
  sort: SortOption
): Promise<AiSearchResponse> {
  const { products, byId, priceRange } = await load()

  if (!query.trim()) {
    // No query → behave like the keyword route's empty state: full catalog,
    // filtered + sorted. No embedding call.
    const filtered = applyFilters(products, filters)
    return {
      results: applySort(filtered, sort),
      total: products.length,
      priceRange,
      semantic: false,
    }
  }

  const vector = await embedOne(query)
  const hits = await searchVectors(vector, TOP_K)

  // Preserve Qdrant's relevance order; drop any id we don't recognize.
  const ranked: Product[] = []
  for (const hit of hits) {
    const p = byId.get(hit.id)
    if (p) ranked.push(p)
  }

  const filtered = applyFilters(ranked, filters)
  // 'relevance' keeps Qdrant's semantic order; other sorts re-order as usual.
  const results = sort === 'relevance' ? filtered : applySort(filtered, sort)

  return { results, total: products.length, priceRange, semantic: true }
}
