import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import ArtworkImage from '../components/ArtworkImage'
import StatusPanel from '../components/StatusPanel'
import { useBrowseArtworks } from '../hooks/useBrowseArtworks'
import { rememberScroll, useScrollMemory } from '../hooks/useScrollMemory'
import { ARTWORK_PAGE_SIZE, searchArtworks, sortArtworks, type Artwork, type SortKey, type SortOrder } from '../lib/artworks'

const sortLabels: Record<SortKey, string> = {
  title: 'Artwork name', artist: 'Artist', date: 'Creation date', type: 'Art type',
}

function useDebouncedQuery(value: string, composing: boolean) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    if (composing) return
    const timer = window.setTimeout(() => setDebounced(value), 300)
    return () => window.clearTimeout(timer)
  }, [value, composing])
  return debounced
}

export default function CollectionsPage() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const sort = (['title', 'artist', 'date', 'type'].includes(params.get('sort') ?? '') ? params.get('sort') : 'title') as SortKey
  const order: SortOrder = params.get('order') === 'desc' ? 'desc' : 'asc'
  const requestedPages = Number(params.get('pages'))
  const pages = Number.isSafeInteger(requestedPages) && requestedPages > 0 ? requestedPages : 1
  const count = ARTWORK_PAGE_SIZE * pages
  const isSearching = Boolean(query.trim())
  const [composing, setComposing] = useState(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebouncedQuery(query, composing)
  const browse = useBrowseArtworks(isSearching ? ARTWORK_PAGE_SIZE : count)
  const [searchResult, setSearchResult] = useState<{ items: Artwork[]; total: number; query: string; count: number } | null>(null)
  const [searchErrorKey, setSearchErrorKey] = useState<string | null>(null)
  const [retryIndex, setRetryIndex] = useState(0)

  useEffect(() => {
    if (!debouncedQuery.trim()) return
    const controller = new AbortController()
    const key = `${debouncedQuery.trim()}|${pages}`
    searchArtworks(debouncedQuery, count, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        setSearchResult({ ...result, query: debouncedQuery.trim(), count })
        setSearchErrorKey(null)
      },
      () => { if (!controller.signal.aborted) setSearchErrorKey(key) },
    )
    return () => controller.abort()
  }, [debouncedQuery, count, pages, retryIndex])

  const resultKey = `${debouncedQuery.trim()}|${pages}`
  const searchError = query === debouncedQuery && searchErrorKey === resultKey
  const sameSearch = query === debouncedQuery && searchResult?.query === debouncedQuery.trim()
  const searchLoadingMore = isSearching && sameSearch && Boolean(searchResult?.items.length) && (searchResult?.count ?? 0) < count && !searchError
  const searchLoadMoreError = searchError && sameSearch && Boolean(searchResult?.items.length)
  const isPending = isSearching && !searchError && !searchLoadingMore && (!sameSearch || (searchResult?.count ?? 0) < count)
  const isReady = isSearching ? !isPending && !searchError : browse.status === 'ready'
  const items = useMemo(
    () => sortArtworks(isSearching ? sameSearch ? searchResult?.items ?? [] : [] : browse.items, sort, order),
    [isSearching, sameSearch, searchResult, browse.items, sort, order],
  )
  const hasMore = isSearching ? items.length < (searchResult?.total ?? 0) : browse.hasMore
  const loadingMore = isSearching ? searchLoadingMore : browse.loadingMore
  const loadMoreError = isSearching ? searchLoadMoreError : browse.loadMoreError
  const sourcePath = `${location.pathname}${location.search}`
  useScrollMemory(isReady)

  function updateParam(key: string, value: string, resetPages = false) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      if (resetPages) next.delete('pages')
      return next
    }, { replace: true })
  }

  function detailPath(id: number) {
    const context = new URLSearchParams({ from: 'collections' })
    for (const [key, value] of params) context.set(key, value)
    return `/artworks/${id}?${context}`
  }

  return <div className="page collections-page">
    <div className="page-intro">
      <div>
        <p className="eyebrow">THE ART INSTITUTE OF CHICAGO · DIGITAL COLLECTION</p>
        <h1>Art Collections</h1>
      </div>
    </div>

    <div className="list-toolbar">
      <label className="search-field">
        <span className="sr-only">Search artwork names or artists</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 5 5" /></svg>
        <input ref={searchInput} value={query} onChange={(event) => updateParam('q', event.target.value, true)} onCompositionStart={() => setComposing(true)} onCompositionEnd={(event) => { setComposing(false); updateParam('q', event.currentTarget.value, true) }} placeholder="Search artworks or artists" type="search" />
        {query && <button type="button" aria-label="Clear search" className="clear-search" onClick={() => { setComposing(false); updateParam('q', '', true); searchInput.current?.focus() }}>×</button>}
      </label>
      <label className="select-field sort-field">
        <span>Sort by</span>
        <select value={sort} onChange={(event) => updateParam('sort', event.target.value)}>
          {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button type="button" className="order-button" onClick={() => updateParam('order', order === 'asc' ? 'desc' : 'asc')} aria-label={`Sort ${order === 'asc' ? 'descending' : 'ascending'}`} title={`Currently ${order === 'asc' ? 'ascending' : 'descending'}`}>
        <span aria-hidden="true">{order === 'asc' ? '↑' : '↓'}</span>
        <span>{order === 'asc' ? 'Ascending' : 'Descending'}</span>
      </button>
    </div>

    {(!isSearching && browse.status === 'loading') || (isSearching && isPending)
      ? <StatusPanel title="Gathering artworks" message="Searching the collection…" loading />
      : (!isSearching && browse.status === 'error') || (isSearching && searchError && !searchLoadMoreError)
        ? <StatusPanel title="The collection could not be loaded" message="Check your connection and try again." action="Try again" onAction={isSearching ? () => { setSearchErrorKey(null); setRetryIndex((value) => value + 1) } : browse.retry} />
        : items.length === 0
          ? <StatusPanel title={isSearching ? 'No artworks found' : 'No artworks available'} message={isSearching ? 'Try another artwork name or artist.' : 'Please try again shortly.'} action={isSearching ? 'Clear search' : 'Try again'} onAction={isSearching ? () => updateParam('q', '', true) : browse.retry} />
          : <>
            <div className="artwork-list">
              {items.map((artwork, index) => <Link className="list-item" key={artwork.id} to={detailPath(artwork.id)} onClick={() => rememberScroll(sourcePath)}>
                <ArtworkImage key={`${artwork.id}-${artwork.image_id}`} artwork={artwork} size={200} className="list-image" eager={index < 4} />
                <span className="list-text">
                  <strong>{artwork.title || 'Untitled'}</strong>
                  <span className="list-meta">
                    <span>{artwork.artwork_type_title || 'Artwork'}</span>
                    <span>{artwork.artist_title || 'Artist unknown'}</span>
                    <span>{artwork.date_display || 'Date unknown'}</span>
                  </span>
                </span>
              </Link>)}
            </div>
            {hasMore && <div className="load-more"><button type="button" className="button button-outline" disabled={loadingMore} onClick={loadMoreError ? isSearching ? () => { setSearchErrorKey(null); setRetryIndex((value) => value + 1) } : browse.retry : () => updateParam('pages', String(pages + 1))}>{loadMoreError ? 'Try loading again' : loadingMore ? 'Loading artworks…' : 'Load more artworks'} <span aria-hidden="true">↓</span></button></div>}
          </>}
  </div>
}
