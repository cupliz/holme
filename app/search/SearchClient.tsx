'use client'

import { useState, useEffect, useRef } from 'react'
import { Product } from '@/lib/products'
import { Filters, SortOption } from '@/lib/keyword-search'
import FilterBar from '@/components/FilterBar'
import ProductGrid from '@/components/ProductGrid'

const DEFAULT_FILTERS: Filters = {
  category: null,
  inStock: false,
  minPrice: null,
  maxPrice: null,
  minRating: null,
}

function buildParams(query: string, filters: Filters, sort: SortOption): string {
  const sp = new URLSearchParams()
  if (query.trim()) sp.set('q', query)
  if (sort !== 'relevance') sp.set('sort', sort)
  if (filters.category) sp.set('category', filters.category)
  if (filters.inStock) sp.set('inStock', '1')
  if (filters.minPrice !== null) sp.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== null) sp.set('maxPrice', String(filters.maxPrice))
  if (filters.minRating !== null) sp.set('minRating', String(filters.minRating))
  return sp.toString()
}

export default function SearchClient({
  initialResults,
  total,
  priceRange,
}: {
  initialResults: Product[]
  total: number
  priceRange: { min: number; max: number }
}) {
  const [query, setQuery] = useState('')
  // The query that the current `results` actually reflect. The input stays
  // bound to `query` for instant typing; `committedQuery` only updates once a
  // response lands, so highlighting (and the grid) don't re-render per keystroke.
  const [committedQuery, setCommittedQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortOption>('relevance')
  const [results, setResults] = useState<Product[]>(initialResults)
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounce the query (600ms), then fetch results from the server. Filters and
  // sort changes go through the same debounced request. The input stays bound
  // to `query` for instant typing; the grid renders against `committedQuery`,
  // which only changes when results arrive, so keystrokes don't cascade re-renders.
  useEffect(() => {
    const controller = new AbortController()
    const id = setTimeout(async () => {
      setPending(true)
      try {
        const res = await fetch(`/api/search?${buildParams(query, filters, sort)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        setResults(data.results)
        setCommittedQuery(query)
        setPending(false)
      } catch (err) {
        // Ignore aborts from a superseded request; surface anything else.
        if ((err as Error).name !== 'AbortError') setPending(false)
      }
    }, 600)
    return () => {
      clearTimeout(id)
      controller.abort()
    }
  }, [query, filters, sort])

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero search */}
      <div className="bg-white border-b border-neutral-100 px-4 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase mb-3">4,000 home goods</p>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search home goods…"
              className="w-full pl-12 pr-10 py-4 text-lg bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all placeholder:text-neutral-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-neutral-100 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <FilterBar filters={filters} onChange={setFilters} priceRange={priceRange} />
        </div>
      </div>

      {/* Results */}
      <div
        className={`max-w-7xl mx-auto px-4 py-8 transition-opacity ${pending ? 'opacity-60' : 'opacity-100'}`}
      >
        <ProductGrid
          products={results}
          query={committedQuery}
          sort={sort}
          onSortChange={setSort}
          total={total}
        />
      </div>
    </div>
  )
}
