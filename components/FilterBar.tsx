import { Filters } from '@/lib/keyword-search'

const CATEGORIES = ['Bath', 'Decor', 'Furniture', 'Kitchen', 'Lighting', 'Office', 'Outdoor', 'Storage', 'Textiles', 'Wall Art']

export default function FilterBar({
  filters,
  onChange,
  priceRange,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  priceRange: { min: number; max: number }
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-4">
      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => set({ category: null })}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filters.category === null
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => set({ category: filters.category === cat ? null : cat })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filters.category === cat
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* In stock */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => set({ inStock: !filters.inStock })}
            className={`relative w-9 h-5 rounded-full transition-colors ${filters.inStock ? 'bg-neutral-900' : 'bg-neutral-200'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${filters.inStock ? 'translate-x-4' : ''}`} />
          </div>
          <span className="text-sm text-neutral-600">In stock only</span>
        </label>

        {/* Min rating */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">Min rating</span>
          <div className="flex gap-1">
            {[null, 3, 4, 4.5].map((r) => (
              <button
                key={String(r)}
                onClick={() => set({ minRating: filters.minRating === r ? null : r })}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filters.minRating === r
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {r === null ? 'Any' : `${r}+★`}
              </button>
            ))}
          </div>
        </div>

        {/* Price range */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">Price</span>
          <input
            type="number"
            placeholder={`$${priceRange.min}`}
            value={filters.minPrice ?? ''}
            onChange={(e) => set({ minPrice: e.target.value ? Number(e.target.value) : null })}
            className="w-20 px-2 py-1 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
          />
          <span className="text-neutral-400 text-sm">—</span>
          <input
            type="number"
            placeholder={`$${priceRange.max}`}
            value={filters.maxPrice ?? ''}
            onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : null })}
            className="w-24 px-2 py-1 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
          />
        </div>
      </div>
    </div>
  )
}
