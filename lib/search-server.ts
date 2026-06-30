import { fetchProducts, Product } from './products'
import { buildIndex, search, Filters, SortOption } from './keyword-search'

// Server-side search backed by a module-level cache. The product list is
// fetched and the Fuse index is built once per server instance, then reused
// across every /api/search request — so querying is in-memory, not a re-fetch
// or re-index per keystroke.

let cache: Promise<{ products: Product[]; priceRange: { min: number; max: number } }> | null = null

function load() {
  if (!cache) {
    cache = fetchProducts().then((products) => {
      buildIndex(products)
      const prices = products.filter((p) => p.price !== null).map((p) => p.price as number)
      const priceRange = prices.length
        ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
        : { min: 0, max: 0 }
      return { products, priceRange }
    })
  }
  return cache
}

export type SearchResponse = {
  results: Product[]
  total: number
  priceRange: { min: number; max: number }
}

export async function runSearch(
  query: string,
  filters: Filters,
  sort: SortOption
): Promise<SearchResponse> {
  const { products, priceRange } = await load()
  const { results } = search(query, products, filters, sort)
  return { results, total: products.length, priceRange }
}
