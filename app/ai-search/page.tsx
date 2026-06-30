import { runAiSearch } from '@/lib/ai-search-server'
import AiSearchClient from './AiSearchClient'

export const metadata = { title: 'AI Search — Holme' }

const DEFAULT_FILTERS = {
  category: null,
  inStock: false,
  minPrice: null,
  maxPrice: null,
  minRating: null,
}

export default async function AiSearchPage() {
  // Empty query → full catalog (no embedding call) so first paint isn't empty.
  // Semantic searches are fetched from /api/ai-search by the client.
  const { results, total, priceRange } = await runAiSearch('', DEFAULT_FILTERS, 'relevance')
  return (
    <AiSearchClient
      initialResults={results}
      total={total}
      priceRange={priceRange}
    />
  )
}
