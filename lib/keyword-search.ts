import Fuse from 'fuse.js'
import { Product } from './products'

export type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'newest'

export type Filters = {
  category: string | null
  inStock: boolean
  minPrice: number | null
  maxPrice: number | null
  minRating: number | null
}

let fuse: Fuse<Product> | null = null

export function buildIndex(products: Product[]) {
  fuse = new Fuse(products, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'brand', weight: 0.2 },
      { name: 'category', weight: 0.15 },
      { name: 'tags', weight: 0.15 },
      { name: 'description', weight: 0.1 },
    ],
    threshold: 0.35,
    includeScore: true,
    ignoreLocation: true,
  })
}

function applyFilters(products: Product[], filters: Filters): Product[] {
  return products.filter((p) => {
    if (filters.category && p.category !== filters.category) return false
    if (filters.inStock && !p.inStock) return false
    if (filters.minPrice !== null && (p.price === null || p.price < filters.minPrice)) return false
    if (filters.maxPrice !== null && (p.price === null || p.price > filters.maxPrice)) return false
    if (filters.minRating !== null && (p.rating === null || p.rating < filters.minRating)) return false
    return true
  })
}

function applySort(products: Product[], sort: SortOption): Product[] {
  const arr = [...products]
  switch (sort) {
    case 'price-asc':
      return arr.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    case 'price-desc':
      return arr.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))
    case 'rating':
      return arr.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
    case 'newest':
      return arr.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
    default:
      return arr
  }
}

export function search(
  query: string,
  allProducts: Product[],
  filters: Filters,
  sort: SortOption
): { results: Product[]; matchedIds: Set<number> } {
  let results: Product[]
  const matchedIds = new Set<number>()

  if (!query.trim()) {
    results = allProducts
  } else {
    if (!fuse) buildIndex(allProducts)

    const fuseResults = fuse!.search(query)
    const q = query.toLowerCase()

    // exact title substring matches pinned to top
    const exact: Product[] = []
    const fuzzy: Product[] = []

    for (const r of fuseResults) {
      matchedIds.add(r.item.id)
      if (r.item.title.toLowerCase().includes(q)) {
        exact.push(r.item)
      } else {
        fuzzy.push(r.item)
      }
    }

    results = [...exact, ...fuzzy]
  }

  const filtered = applyFilters(results, filters)
  return { results: applySort(filtered, sort), matchedIds }
}
