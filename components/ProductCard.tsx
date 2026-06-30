'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import { Product } from '@/lib/products'
import RatingStars from './RatingStars'

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-100 text-amber-900 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function ProductCard({
  product,
  query = '',
}: {
  product: Product
  query?: string
}) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const showPlaceholder = !product.image || imgError

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden border border-neutral-100 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-neutral-50">
        {showPlaceholder ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
            <svg className="w-12 h-12 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        ) : (
          <Image
            src={product.image!}
            alt={product.title}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        )}

        {/* Stock badge */}
        <div className="absolute top-2 left-2">
          {product.inStock ? (
            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              In Stock
            </span>
          ) : (
            <span className="text-[10px] font-medium bg-neutral-100 text-neutral-400 border border-neutral-200 px-2 py-0.5 rounded-full">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-neutral-400 truncate">{product.brand}</p>
            <h3 className="text-sm font-medium text-neutral-900 leading-snug line-clamp-2">
              {highlight(product.title, query)}
            </h3>
          </div>
          <span className="shrink-0 text-[10px] font-medium bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full whitespace-nowrap">
            {product.category}
          </span>
        </div>

        <RatingStars rating={product.rating} reviews={product.reviews} />

        <p className="text-sm font-semibold text-neutral-900">
          {product.price !== null ? `$${product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Price unavailable'}
        </p>
      </div>

      {/* Hover quick-view */}
      {hovered && (product.description || product.tags.length > 0) && (
        <div className="absolute inset-x-0 bottom-0 bg-white border-t border-neutral-100 p-3 shadow-xl rounded-b-2xl z-10 transition-all duration-150">
          {product.description && (
            <p className="text-xs text-neutral-600 line-clamp-3 mb-2">{product.description}</p>
          )}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-neutral-50 text-neutral-500 border border-neutral-200 px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Memoized so an unchanged card never re-renders when the parent grid updates
// (e.g. when `query`/highlight changes, only matching cards re-render).
export default memo(ProductCard)
