import axios from 'axios'

const api = axios.create({
  baseURL: 'https://api.artic.edu/api/v1',
  timeout: 15000,
})

const listFields = [
  'id', 'title', 'image_id', 'thumbnail', 'artist_title', 'artist_display',
  'artwork_type_title', 'department_title', 'date_start', 'date_display',
  'is_public_domain', 'main_reference_number',
].join(',')

const detailFields = [
  listFields, 'description', 'short_description', 'medium_display',
  'dimensions', 'place_of_origin', 'credit_line',
].join(',')

export interface Artwork {
  id: number
  title: string | null
  image_id: string | null
  thumbnail: { width?: number; height?: number; lqip?: string } | null
  artist_title: string | null
  artist_display: string | null
  artwork_type_title: string | null
  department_title: string | null
  date_start: number | null
  date_display: string | null
  is_public_domain: boolean
  main_reference_number: string | null
  description?: string | null
  short_description?: string | null
  medium_display?: string | null
  dimensions?: string | null
  place_of_origin?: string | null
  credit_line?: string | null
  iiifBase: string | null
}

interface ApiResponse<T> {
  data: T
  config?: { iiif_url?: string }
  pagination?: { total?: number }
}

type ApiArtwork = Omit<Artwork, 'iiifBase'>

export interface ArtworkPage {
  items: Artwork[]
  total: number
}

function normalize(data: ApiArtwork[], base?: string): Artwork[] {
  return data.map((artwork) => ({
    ...artwork,
    iiifBase: base?.replace(/\/$/, '') ?? null,
  }))
}

function searchPayload(query: object, size: number, fields = listFields) {
  return { params: JSON.stringify({ query, fields, size, from: 0 }) }
}

async function search(query: object, size: number, signal?: AbortSignal): Promise<ArtworkPage> {
  const { data } = await api.get<ApiResponse<ApiArtwork[]>>('/artworks/search', {
    params: searchPayload(query, size),
    signal,
  })
  return {
    items: normalize(data.data ?? [], data.config?.iiif_url),
    total: data.pagination?.total ?? data.data?.length ?? 0,
  }
}

let featuredPromise: Promise<Artwork[]> | null = null

export function getFeaturedArtworks(): Promise<Artwork[]> {
  if (!featuredPromise) {
    featuredPromise = (async () => {
      const highlighted = await search({
        bool: {
          must: [
            { term: { is_boosted: true } },
            { term: { is_public_domain: true } },
            { exists: { field: 'image_id' } },
          ],
        },
      }, 72).catch(() => ({ items: [], total: 0 }))

      const unique = new Map(highlighted.items.map((artwork) => [artwork.id, artwork]))
      if (unique.size < 48) {
        const more = await search({
          bool: {
            must: [
              { term: { is_public_domain: true } },
              { exists: { field: 'image_id' } },
            ],
          },
        }, 72)
        for (const artwork of more.items) unique.set(artwork.id, artwork)
      }
      return [...unique.values()]
        .filter((artwork) => artwork.image_id && artwork.is_public_domain)
        .slice(0, 72)
    })().catch((error: unknown) => {
      featuredPromise = null
      throw error
    })
  }
  return featuredPromise
}

export async function searchArtworks(query: string, count: number, signal?: AbortSignal): Promise<ArtworkPage> {
  const term = query.trim()
  const pattern = `*${term.replace(/[\\*?]/g, '\\$&')}*`
  const artworkQuery = {
    bool: {
      should: [
        { wildcard: { 'title.keyword': { value: pattern, case_insensitive: true } } },
        { wildcard: { 'artist_title.keyword': { value: pattern, case_insensitive: true } } },
      ],
      minimum_should_match: 1,
    },
  }
  return search(artworkQuery, count, signal)
}

export async function getArtwork(id: number, signal?: AbortSignal): Promise<Artwork> {
  const { data } = await api.get<ApiResponse<ApiArtwork>>(`/artworks/${id}`, {
    params: { fields: detailFields },
    signal,
  })
  if (!data.data || typeof data.data.id !== 'number') throw new Error('Artwork data is unavailable')
  return normalize([data.data], data.config?.iiif_url)[0]
}

export function artworkImageUrl(artwork: Artwork, width: 200 | 400 | 843): string | null {
  if (!artwork.is_public_domain || !artwork.image_id || !artwork.iiifBase) return null
  return `${artwork.iiifBase}/${encodeURIComponent(artwork.image_id)}/full/${width},/0/default.jpg`
}

export type SortKey = 'title' | 'artist' | 'date' | 'type'
export type SortOrder = 'asc' | 'desc'

export function sortArtworks(items: Artwork[], key: SortKey, order: SortOrder): Artwork[] {
  const direction = order === 'asc' ? 1 : -1
  const getValue = (artwork: Artwork): string | number | null => {
    if (key === 'artist') return artwork.artist_title
    if (key === 'date') return artwork.date_start
    if (key === 'type') return artwork.artwork_type_title
    return artwork.title
  }
  return [...items].sort((left, right) => {
    const a = getValue(left)
    const b = getValue(right)
    if (a === null || a === undefined || a === '') return b === null || b === undefined || b === '' ? left.id - right.id : 1
    if (b === null || b === undefined || b === '') return -1
    const result = typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b), 'en', { sensitivity: 'base', numeric: true })
    return result === 0 ? left.id - right.id : result * direction
  })
}

export type Period = '' | 'before1800' | '1800s' | '1900to1949' | '1950plus'

export interface GalleryFilters {
  type: string
  artist: string
  period: Period
  department: string
}

export function filterGallery(items: Artwork[], filters: GalleryFilters): Artwork[] {
  return items.filter((artwork) => {
    if (filters.type && artwork.artwork_type_title !== filters.type) return false
    if (filters.artist && artwork.artist_title !== filters.artist) return false
    if (filters.department && artwork.department_title !== filters.department) return false
    if (filters.period) {
      const year = artwork.date_start
      if (year === null) return false
      if (filters.period === 'before1800' && year >= 1800) return false
      if (filters.period === '1800s' && (year < 1800 || year > 1899)) return false
      if (filters.period === '1900to1949' && (year < 1900 || year > 1949)) return false
      if (filters.period === '1950plus' && year < 1950) return false
    }
    return true
  })
}

export function arrangeGallery(items: Artwork[]): Artwork[] {
  const bedroomId = 28560
  const basketId = 111436
  const bedroomIndex = items.findIndex((artwork) => artwork.id === bedroomId)
  const basket = items.find((artwork) => artwork.id === basketId)
  if (bedroomIndex < 0 || !basket || items[bedroomIndex + 1]?.id === basket.id) return items
  const withoutBasket = items.filter((artwork) => artwork.id !== basketId)
  const insertAt = withoutBasket.findIndex((artwork) => artwork.id === bedroomId) + 1
  return [...withoutBasket.slice(0, insertAt), basket, ...withoutBasket.slice(insertAt)]
}

export function plainText(value: string | null | undefined): string {
  if (!value) return ''
  const doc = new DOMParser().parseFromString(value, 'text/html')
  doc.querySelectorAll('script, style').forEach((node) => node.remove())
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}
