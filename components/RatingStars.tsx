export default function RatingStars({ rating, reviews }: { rating: number | null; reviews: number }) {
  if (rating === null) {
    return <span className="text-xs text-neutral-400">No ratings yet</span>
  }

  const full = Math.floor(rating)
  const half = rating - full >= 0.5

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20">
            {i <= full ? (
              <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#f59e0b" />
            ) : half && i === full + 1 ? (
              <>
                <defs>
                  <linearGradient id={`h${i}`}>
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#d4d4d4" />
                  </linearGradient>
                </defs>
                <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill={`url(#h${i})`} />
              </>
            ) : (
              <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill="#d4d4d4" />
            )}
          </svg>
        ))}
      </div>
      <span className="text-xs text-neutral-500">{rating.toFixed(1)}</span>
      {reviews > 0 && <span className="text-xs text-neutral-400">({reviews.toLocaleString()})</span>}
    </div>
  )
}
