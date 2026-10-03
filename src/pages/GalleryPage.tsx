import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import GalleryWall from '../components/GalleryWall'
import StatusPanel from '../components/StatusPanel'
import { useFeatured } from '../hooks/useFeatured'
import { useScrollMemory } from '../hooks/useScrollMemory'
import { arrangeGallery, filterGallery, type Artwork, type GalleryFilters, type Period } from '../lib/artworks'

const periods: { value: Period; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'before1800', label: 'Before 1800' },
  { value: '1800s', label: '1800–1899' },
  { value: '1900to1949', label: '1900–1949' },
  { value: '1950plus', label: '1950 onward' },
]

function uniqueOptions(items: Artwork[], key: 'artwork_type_title' | 'artist_title' | 'department_title') {
  return [...new Set(items.map((item) => item[key]).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b))
}

export default function GalleryPage() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const featured = useFeatured()
  const filters: GalleryFilters = {
    type: params.get('type') ?? '',
    artist: params.get('artist') ?? '',
    period: (periods.some((period) => period.value === params.get('period')) ? params.get('period') : '') as Period,
    department: params.get('department') ?? '',
  }
  const filtered = useMemo(
    () => arrangeGallery(filterGallery(featured.items, { type: filters.type, artist: filters.artist, period: filters.period, department: filters.department })),
    [featured.items, filters.type, filters.artist, filters.period, filters.department],
  )
  const types = useMemo(() => uniqueOptions(featured.items, 'artwork_type_title'), [featured.items])
  const artists = useMemo(() => uniqueOptions(featured.items, 'artist_title'), [featured.items])
  const departments = useMemo(() => uniqueOptions(featured.items, 'department_title'), [featured.items])
  const hasFilters = Boolean(filters.type || filters.artist || filters.period || filters.department)
  const sourcePath = `${location.pathname}${location.search}`
  useScrollMemory(featured.status === 'ready')

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
    return `/artworks/${id}?${context}`
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
      {hasFilters && <button className="clear-filters" type="button" onClick={() => setParams({}, { replace: true })}>Clear filters ×</button>}
    </div>

    {featured.status === 'loading'
      ? <StatusPanel title="Gathering artworks" message="Preparing the gallery…" loading />
      : featured.status === 'error'
        ? <StatusPanel title="The gallery could not be loaded" message="Check your connection and try again." action="Try again" onAction={featured.retry} />
        : filtered.length === 0
          ? <StatusPanel title="No artworks match these filters" message="Try a different combination." action="Clear filters" onAction={() => setParams({}, { replace: true })} />
          : <GalleryWall items={filtered} sourcePath={sourcePath} detailPath={detailPath} />}
  </div>
}
