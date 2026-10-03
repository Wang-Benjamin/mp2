import axios from 'axios'

const api = axios.create({
  baseURL: 'https://api.artic.edu/api/v1',
  timeout: 15000,
})

export const ARTWORK_PAGE_SIZE = 20

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

function searchPayload(query: object, size: number, from: number) {
  return { params: JSON.stringify({ query, fields: listFields, size, from }) }
}

async function search(query: object, size: number, from: number, signal?: AbortSignal): Promise<ArtworkPage> {
  const { data } = await api.get<ApiResponse<ApiArtwork[]>>('/artworks/search', {
    params: searchPayload(query, size, from),
    signal,
  })
  return {
    items: normalize(data.data ?? [], data.config?.iiif_url),
    total: data.pagination?.total ?? data.data?.length ?? 0,
  }
}

const highlightedQuery = {
  bool: {
    must: [
      { term: { is_boosted: true } },
      { term: { is_public_domain: true } },
      { exists: { field: 'image_id' } },
    ],
  },
}

const browseCache = {
  items: [] as Artwork[],
  ids: new Set<number>(),
  highlightedOffset: 0,
  highlightedTotal: null as number | null,
  catalogPage: 1,
  done: false,
  pending: null as Promise<void> | null,
}

function addBrowseItems(items: Artwork[]) {
  for (const artwork of items) {
    if (!artwork.is_public_domain || !artwork.image_id || browseCache.ids.has(artwork.id)) continue
    browseCache.ids.add(artwork.id)
    browseCache.items.push(artwork)
  }
}

async function loadBrowseBatch(size: number) {
  if (browseCache.highlightedTotal === null || browseCache.highlightedOffset < browseCache.highlightedTotal) {
    const result = await search(highlightedQuery, size, browseCache.highlightedOffset)
    browseCache.highlightedOffset += result.items.length
    browseCache.highlightedTotal = result.items.length ? result.total : browseCache.highlightedOffset
    addBrowseItems(result.items)
    return
  }

  const { data } = await api.get<ApiResponse<ApiArtwork[]>>('/artworks', {
    params: { page: browseCache.catalogPage, limit: 100, fields: listFields },
  })
  browseCache.catalogPage += 1
  addBrowseItems(normalize(data.data ?? [], data.config?.iiif_url))
  browseCache.done = !data.data?.length || (data.pagination?.total !== undefined && (browseCache.catalogPage - 1) * 100 >= data.pagination.total)
}

export async function getBrowseArtworks(count: number): Promise<ArtworkPage & { hasMore: boolean }> {
  while (browseCache.items.length < count && !browseCache.done) {
    if (!browseCache.pending) {
      browseCache.pending = loadBrowseBatch(Math.min(100, count - browseCache.items.length)).finally(() => { browseCache.pending = null })
    }
    await browseCache.pending
  }
  return {
    items: browseCache.items.slice(0, count),
    total: browseCache.items.length,
    hasMore: browseCache.items.length > count || !browseCache.done,
  }
}

const searchCache = new Map<string, { items: Artwork[]; total: number }>()

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
  let cached = searchCache.get(term)
  if (!cached) {
    cached = { items: [], total: Number.POSITIVE_INFINITY }
    searchCache.set(term, cached)
    if (searchCache.size > 12) searchCache.delete(searchCache.keys().next().value!)
  }
  while (cached.items.length < count && cached.items.length < cached.total) {
    const from = cached.items.length
    const result = await search(artworkQuery, Math.min(100, count - from), from, signal)
    if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError')
    cached.total = Math.min(result.total, 10000)
    if (cached.items.length === from) {
      cached.items.push(...result.items)
      if (result.items.length === 0) cached.total = from
    }
  }
  return { items: cached.items.slice(0, count), total: cached.total }
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

interface FilteredGalleryCache {
  items: Artwork[]
  ids: Set<number>
  highlightedOffset: number
  highlightedTotal: number | null
  otherOffset: number
  otherTotal: number | null
  done: boolean
  pending: Promise<void> | null
}

const filteredGalleryCaches = new Map<string, FilteredGalleryCache>()

function galleryQuery(filters: GalleryFilters, highlighted: boolean) {
  const must: object[] = [
    { term: { is_public_domain: true } },
    { exists: { field: 'image_id' } },
  ]
  if (highlighted) must.push({ term: { is_boosted: true } })
  if (filters.type) must.push({ term: { 'artwork_type_title.keyword': filters.type } })
  if (filters.artist) must.push({ term: { 'artist_title.keyword': filters.artist } })
  if (filters.department) must.push({ term: { 'department_title.keyword': filters.department } })
  if (filters.period === 'before1800') must.push({ range: { date_start: { lt: 1800 } } })
  if (filters.period === '1800s') must.push({ range: { date_start: { gte: 1800, lte: 1899 } } })
  if (filters.period === '1900to1949') must.push({ range: { date_start: { gte: 1900, lte: 1949 } } })
  if (filters.period === '1950plus') must.push({ range: { date_start: { gte: 1950 } } })
  return { bool: { must, ...(!highlighted && { must_not: [{ term: { is_boosted: true } }] }) } }
}

async function loadFilteredGalleryBatch(cache: FilteredGalleryCache, filters: GalleryFilters, size: number) {
  const highlighted = cache.highlightedTotal === null || cache.highlightedOffset < cache.highlightedTotal
  const offset = highlighted ? cache.highlightedOffset : cache.otherOffset
  const result = await search(galleryQuery(filters, highlighted), size, offset)
  if (highlighted) {
    cache.highlightedOffset += result.items.length
    cache.highlightedTotal = result.items.length ? result.total : cache.highlightedOffset
  } else {
    cache.otherOffset += result.items.length
    cache.otherTotal = result.items.length ? Math.min(result.total, 10000) : cache.otherOffset
    cache.done = cache.otherOffset >= cache.otherTotal
  }
  for (const artwork of result.items) {
    if (!artwork.is_public_domain || !artwork.image_id || cache.ids.has(artwork.id)) continue
    cache.ids.add(artwork.id)
    cache.items.push(artwork)
  }
}

export async function getFilteredGalleryArtworks(filters: GalleryFilters, count: number): Promise<ArtworkPage & { hasMore: boolean }> {
  const key = JSON.stringify([filters.type, filters.artist, filters.period, filters.department])
  let cache = filteredGalleryCaches.get(key)
  if (!cache) {
    cache = { items: [], ids: new Set(), highlightedOffset: 0, highlightedTotal: null, otherOffset: 0, otherTotal: null, done: false, pending: null }
    filteredGalleryCaches.set(key, cache)
    if (filteredGalleryCaches.size > 8) filteredGalleryCaches.delete(filteredGalleryCaches.keys().next().value!)
  }
  while (cache.items.length < count && !cache.done) {
    if (!cache.pending) cache.pending = loadFilteredGalleryBatch(cache, filters, Math.min(100, count - cache.items.length)).finally(() => { cache.pending = null })
    await cache.pending
  }
  return { items: cache.items.slice(0, count), total: cache.items.length, hasMore: cache.items.length > count || !cache.done }
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
