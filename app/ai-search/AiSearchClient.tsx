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

const EXAMPLES = [
  'cozy furniture',
  'modern kitchen table',
  'something to hold my keys',
  'warm lighting for a small space',
]

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

export default function AiSearchClient({
  initialResults,
  total,
  priceRange,
}: {
  initialResults: Product[]
  total: number
  priceRange: { min: number; max: number }
}) {
  // `query` is the raw input — typing it triggers NO network call, so an
  // unfinished phrase never burns an embedding. A search only runs when the
  // user submits (button / Enter / example chip), which sets `submittedQuery`.
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  // The query the current `results` actually reflect — drives highlighting and
  // the result label. Only updates once a response lands.
  const [committedQuery, setCommittedQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortOption>('relevance')
  const [results, setResults] = useState<Product[]>(initialResults)
  const [pending, setPending] = useState(false)
  const [semantic, setSemantic] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Skip the very first effect run: the server already rendered the unfiltered
  // catalog into `initialResults`, so fetching again on mount is wasteful.
  const mounted = useRef(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fire the search when the submitted query, filters, or sort change. Embedding
  // happens server-side once per submit; changing filters/sort re-ranks the same
  // submitted phrase (still one embed call, query is cached server-side by text).
  // The grid dims (`pending`) during the round-trip rather than blanking.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const controller = new AbortController()
    ;(async () => {
      setPending(true)
      setError(null)
      try {
        const res = await fetch(`/api/ai-search?${buildParams(submittedQuery, filters, sort)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Search failed')
        setResults(data.results)
        setSemantic(Boolean(data.semantic))
        setCommittedQuery(submittedQuery)
        setPending(false)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message)
          setPending(false)
        }
      }
    })()
    return () => controller.abort()
  }, [submittedQuery, filters, sort])

  // Commit the current input as the search. Submitting the same text again is a
  // no-op (state unchanged → effect doesn't re-run), so repeat clicks are free.
  function runSearch() {
    setSubmittedQuery(query.trim())
  }

  function clearSearch() {
    setQuery('')
    setSubmittedQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero search */}
      <div className="bg-white border-b border-neutral-100 px-4 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase mb-3">
            Semantic search · powered by AI
          </p>
          <p className="text-sm text-neutral-500 mb-4">
            Search by meaning, not keywords. Type a phrase like &ldquo;cozy furniture&rdquo; or &ldquo;modern kitchen table.&rdquo;
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              runSearch()
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe what you're looking for…"
                className="w-full pl-12 pr-10 py-4 text-lg bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-neutral-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={pending || !query.trim()}
              className="px-6 py-4 text-base font-medium text-white bg-violet-600 rounded-2xl hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            >
              {pending ? 'Searching…' : 'Search'}
            </button>
          </form>

          {/* Example prompts — clicking runs the search immediately */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setQuery(ex)
                  setSubmittedQuery(ex)
                }}
                className="px-3 py-1.5 text-sm text-neutral-600 bg-neutral-100 rounded-full hover:bg-violet-50 hover:text-violet-700 transition-colors"
              >
                {ex}
              </button>
            ))}
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {semantic && committedQuery.trim() && !error && (
          <p className="mb-4 inline-flex items-center gap-1.5 text-sm text-violet-700 bg-violet-50 px-3 py-1.5 rounded-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3l-2.286 6.857L5 12l5.714 2.143L13 21l2.286-6.857L21 12l-5.714-2.143L13 3z" />
            </svg>
            {results.length.toLocaleString()} semantic matches for &ldquo;{committedQuery}&rdquo;
          </p>
        )}
        <div className={`transition-opacity ${pending ? 'opacity-60' : 'opacity-100'}`}>
          <ProductGrid
            products={results}
            query={committedQuery}
            sort={sort}
            onSortChange={setSort}
            total={total}
          />
        </div>
      </div>
    </div>
  )
}
