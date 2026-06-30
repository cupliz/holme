import type { NextRequest } from 'next/server'
import { runSearch } from '@/lib/search-server'
import { Filters, SortOption } from '@/lib/keyword-search'

const SORT_OPTIONS: SortOption[] = ['relevance', 'price-asc', 'price-desc', 'rating', 'newest']

function num(v: string | null): number | null {
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams

  const query = sp.get('q') ?? ''

  const sortParam = sp.get('sort') as SortOption | null
  const sort: SortOption = sortParam && SORT_OPTIONS.includes(sortParam) ? sortParam : 'relevance'

  const filters: Filters = {
    category: sp.get('category') || null,
    inStock: sp.get('inStock') === '1',
    minPrice: num(sp.get('minPrice')),
    maxPrice: num(sp.get('maxPrice')),
    minRating: num(sp.get('minRating')),
  }

  const data = await runSearch(query, filters, sort)
  return Response.json(data)
}
