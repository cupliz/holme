'use client'

import { useEffect, useState } from 'react'
import { Product } from '@/lib/products'
import ProductCard from './ProductCard'
import { SortOption } from '@/lib/keyword-search'

const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Relevance',
  'price-asc': 'Price: Low → High',
  'price-desc': 'Price: High → Low',
  rating: 'Top Rated',
  newest: 'Newest',
}

const PAGE_SIZE = 60

export default function ProductGrid({
  products,
  query,
  sort,
  onSortChange,
  total,
}: {
  products: Product[]
  query: string
  sort: SortOption
  onSortChange: (s: SortOption) => void
  total: number
}) {
  // Only render a slice of the results; "Load more" reveals the next page.
  // Reset back to the first page whenever the result set changes.
  const [visible, setVisible] = useState(PAGE_SIZE)
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [products])

  const shown = products.slice(0, visible)
  const hasMore = visible < products.length

  return (
    <div>
      {/* Result bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-neutral-500">
          {query.trim() ? (
            <>
              <span className="font-medium text-neutral-800">{products.length.toLocaleString()}</span> results for{' '}
              <span className="font-medium text-neutral-800">"{query}"</span>
            </>
          ) : (
            <>
              Showing <span className="font-medium text-neutral-800">{products.length.toLocaleString()}</span> of{' '}
              <span className="font-medium text-neutral-800">{total.toLocaleString()}</span> products
            </>
          )}
        </p>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200"
        >
          {Object.entries(SORT_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="w-12 h-12 text-neutral-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-neutral-500 font-medium">No products found</p>
          <p className="text-neutral-400 text-sm mt-1">Try a different search or adjust your filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} query={query} />
            ))}
          </div>
          {hasMore && (
            <div className="flex flex-col items-center gap-2 mt-8">
              <p className="text-sm text-neutral-400">
                Showing {shown.length.toLocaleString()} of {products.length.toLocaleString()}
              </p>
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="px-6 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-200"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
