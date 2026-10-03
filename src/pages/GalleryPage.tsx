import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import GalleryWall from '../components/GalleryWall'
import StatusPanel from '../components/StatusPanel'
import { useBrowseArtworks } from '../hooks/useBrowseArtworks'
import { useFilteredGalleryArtworks } from '../hooks/useFilteredGalleryArtworks'
import { useScrollMemory } from '../hooks/useScrollMemory'
import { ARTWORK_PAGE_SIZE, arrangeGallery, type Artwork, type GalleryFilters, type Period } from '../lib/artworks'

const periods: { value: Period; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'before1800', label: 'Before 1800' },
  { value: '1800s', label: '1800–1899' },
  { value: '1900to1949', label: '1900–1949' },
  { value: '1950plus', label: '1950 onward' },
]

function uniqueOptions(items: Artwork[], key: 'artwork_type_title' | 'artist_title' | 'department_title', selected: string) {
  return [...new Set([...items.map((item) => item[key]), selected].filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b))
}

export default function GalleryPage() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const requestedPages = Number(params.get('pages'))
  const pages = Number.isSafeInteger(requestedPages) && requestedPages > 0 ? requestedPages : 1
  const count = ARTWORK_PAGE_SIZE * pages
  const browse = useBrowseArtworks(count)
  const filters: GalleryFilters = {
    type: params.get('type') ?? '',
    artist: params.get('artist') ?? '',
    period: (periods.some((period) => period.value === params.get('period')) ? params.get('period') : '') as Period,
    department: params.get('department') ?? '',
  }
  const hasFilters = Boolean(filters.type || filters.artist || filters.period || filters.department)
  const filteredFeed = useFilteredGalleryArtworks(filters, count, hasFilters)
  const feed = hasFilters ? filteredFeed : browse
  const filtered = useMemo(
    () => arrangeGallery(feed.items),
    [feed.items],
  )
  const types = useMemo(() => uniqueOptions(browse.items, 'artwork_type_title', filters.type), [browse.items, filters.type])
  const artists = useMemo(() => uniqueOptions(browse.items, 'artist_title', filters.artist), [browse.items, filters.artist])
  const departments = useMemo(() => uniqueOptions(browse.items, 'department_title', filters.department), [browse.items, filters.department])
  const sourcePath = `${location.pathname}${location.search}`
  useScrollMemory(feed.status === 'ready')

  function updateFilter(key: keyof GalleryFilters, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  function detailPath(id: number) {
    const context = new URLSearchParams({ from: 'gallery' })
    for (const [key, value] of Object.entries(filters)) if (value) context.set(key, value)
    if (pages > 1) context.set('pages', String(pages))
    return `/artworks/${id}?${context}`
  }

  function clearFilters() {
    setParams((previous) => {
      const next = new URLSearchParams()
      if (previous.has('pages')) next.set('pages', previous.get('pages')!)
      return next
    }, { replace: true })
  }

  return <div className="page gallery-page">
    <div className="page-intro">
      <div>
        <p className="eyebrow">THE ART INSTITUTE OF CHICAGO · VISUAL ARCHIVE</p>
        <h1>Art Gallery</h1>
      </div>
    </div>

    <div className="gallery-toolbar" aria-label="Gallery filters">
      <label className="filter-field"><span>Art type</span><select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}><option value="">None</option>{types.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="filter-field"><span>Artist</span><select value={filters.artist} onChange={(event) => updateFilter('artist', event.target.value)}><option value="">None</option>{artists.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="filter-field"><span>Creation period</span><select value={filters.period} onChange={(event) => updateFilter('period', event.target.value)}>{periods.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="filter-field"><span>Department</span><select value={filters.department} onChange={(event) => updateFilter('department', event.target.value)}><option value="">None</option>{departments.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      {hasFilters && <button className="clear-filters" type="button" onClick={clearFilters}>Clear filters ×</button>}
    </div>

    {feed.status === 'loading'
      ? <StatusPanel title="Gathering artworks" message="Preparing the gallery…" loading />
      : feed.status === 'error'
        ? <StatusPanel title="The gallery could not be loaded" message="Check your connection and try again." action="Try again" onAction={feed.retry} />
        : <>
          {filtered.length === 0
            ? <StatusPanel title="No artworks match these filters" message="Try a different combination." action="Clear filters" onAction={clearFilters} />
            : <GalleryWall items={filtered} sourcePath={sourcePath} detailPath={detailPath} />}
          {feed.hasMore && <div className="load-more"><button type="button" className="button button-outline" disabled={feed.loadingMore} onClick={feed.loadMoreError ? feed.retry : () => setParams((previous) => { const next = new URLSearchParams(previous); next.set('pages', String(pages + 1)); return next }, { replace: true })}>{feed.loadMoreError ? 'Try loading again' : feed.loadingMore ? 'Loading artworks…' : 'Load more artworks'} <span aria-hidden="true">↓</span></button></div>}
        </>}
  </div>
}
