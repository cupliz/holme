import { runSearch } from '@/lib/search-server'
import SearchClient from './SearchClient'

export const metadata = { title: 'Search — Holme' }

const DEFAULT_FILTERS = {
  category: null,
  inStock: false,
  minPrice: null,
  maxPrice: null,
  minRating: null,
}

export default async function SearchPage() {
  // Initial, unfiltered result set rendered on the server so first paint isn't
  // empty. Subsequent searches are fetched from /api/search by the client.
  const { results, total, priceRange } = await runSearch('', DEFAULT_FILTERS, 'relevance')
  return (
    <SearchClient
      initialResults={results}
      total={total}
      priceRange={priceRange}
    />
  )
}
