export type Product = {
  id: number
  title: string
  brand: string
  category: string
  tags: string[]
  price: number | null
  rating: number | null
  reviews: number
  inStock: boolean
  releasedAt: string
  image: string | null
  imageWidth: number | null
  imageHeight: number | null
  description: string | null
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function normalizePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return raw === 0 ? null : raw
  const n = parseFloat(String(raw).replace(/,/g, ''))
  if (isNaN(n) || n === 0) return null
  return n
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeProduct(raw: any): Product {
  return {
    id: raw.id,
    title: toTitleCase(raw.title.trim()),
    brand: raw.brand,
    category: raw.category,
    tags: raw.tags ?? [],
    price: normalizePrice(raw.price),
    rating: raw.rating ?? null,
    reviews: raw.reviews ?? 0,
    inStock: raw.inStock,
    releasedAt: raw.releasedAt,
    image: raw.image ?? null,
    imageWidth: raw.imageWidth ?? null,
    imageHeight: raw.imageHeight ?? null,
    description: raw.description ?? null,
  }
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('https://media.downshift.app/hiring/founding-engineer/items.json', {
    next: { revalidate: 86400 },
  })
  const raw = await res.json()
  return raw.map(normalizeProduct)
}
