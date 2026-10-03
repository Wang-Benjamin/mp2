import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import ArtworkImage from '../components/ArtworkImage'
import StatusPanel from '../components/StatusPanel'
import { filterGallery, getArtwork, getFeaturedArtworks, plainText, searchArtworks, sortArtworks, type Artwork, type GalleryFilters, type Period, type SortKey, type SortOrder } from '../lib/artworks'

export default function ArtworkPage() {
  const { id } = useParams()
  const artworkId = Number(id)
  const location = useLocation()
  const [params] = useSearchParams()
  const from = params.get('from') === 'gallery' ? 'gallery' : params.get('from') === 'collections' ? 'collections' : null
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [artworkStatus, setArtworkStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [sequence, setSequence] = useState<Artwork[]>([])
  const [sequenceStatus, setSequenceStatus] = useState<'loading' | 'ready' | 'error'>(from ? 'loading' : 'ready')
  const [retryIndex, setRetryIndex] = useState(0)

  const sourceParams = new URLSearchParams(params)
  sourceParams.delete('from')
  const returnTo = from === 'gallery' ? `/gallery${sourceParams.size ? `?${sourceParams}` : ''}`
    : `/collections${from && sourceParams.size ? `?${sourceParams}` : ''}`

  useEffect(() => {
    if (!Number.isInteger(artworkId) || artworkId <= 0) return
    const controller = new AbortController()
    getArtwork(artworkId, controller.signal).then(
      (item) => { if (!controller.signal.aborted) { setArtwork(item); setArtworkStatus('ready') } },
      () => { if (!controller.signal.aborted) setArtworkStatus('error') },
    )
    return () => controller.abort()
  }, [artworkId, retryIndex])

  useEffect(() => {
    if (!from) return
    let active = true
    const controller = new AbortController()
    const contextParams = new URLSearchParams(location.search)
    const load = async () => {
      if (from === 'gallery') {
        const featured = await getFeaturedArtworks()
        const filters: GalleryFilters = {
          type: contextParams.get('type') ?? '',
          artist: contextParams.get('artist') ?? '',
          period: (contextParams.get('period') ?? '') as Period,
          department: contextParams.get('department') ?? '',
        }
        return filterGallery(featured, filters)
      }
      const query = contextParams.get('q') ?? ''
      const pages = Math.min(10, Math.max(1, Number.parseInt(contextParams.get('pages') ?? '1', 10) || 1))
      const result = query.trim()
        ? (await searchArtworks(query, 24 * pages, controller.signal)).items
        : (await getFeaturedArtworks()).slice(0, 24 * pages)
      const sort = (['title', 'artist', 'date', 'type'].includes(contextParams.get('sort') ?? '') ? contextParams.get('sort') : 'title') as SortKey
      const order: SortOrder = contextParams.get('order') === 'desc' ? 'desc' : 'asc'
      return sortArtworks(result, sort, order)
    }
    load().then(
      (items) => { if (active) { setSequence(items); setSequenceStatus('ready') } },
      () => { if (active) setSequenceStatus('error') },
    )
    return () => { active = false; controller.abort() }
  }, [from, location.search, retryIndex])

  useEffect(() => { window.scrollTo(0, 0) }, [artworkId])

  const position = useMemo(() => sequence.findIndex((item) => item.id === artworkId), [sequence, artworkId])
  const previous = position > 0 ? sequence[position - 1] : null
  const next = position >= 0 && position < sequence.length - 1 ? sequence[position + 1] : null
  const description = plainText(artwork?.description) || plainText(artwork?.short_description)
  const detailPath = (target: Artwork) => `/artworks/${target.id}${location.search}`

  useEffect(() => {
    if (artwork?.id === artworkId) document.title = `${artwork.title || 'Untitled'} — Art Collection`
  }, [artwork, artworkId])

  if (!Number.isInteger(artworkId) || artworkId <= 0) return <div className="page"><StatusPanel title="Artwork not found" message="The artwork address is invalid." action="Browse collections" onAction={() => window.location.assign(`${import.meta.env.BASE_URL}collections`)} /></div>

  return <div className="page detail-page">
    <div className="detail-topline">
      <Link className="back-link" to={returnTo}><span aria-hidden="true">←</span> Back to {from === 'gallery' ? 'gallery' : 'collections'}</Link>
      <span className="detail-index">{position >= 0 && sequenceStatus === 'ready' ? `${String(position + 1).padStart(2, '0')} / ${String(sequence.length).padStart(2, '0')}` : 'ARTWORK INFORMATION'}</span>
    </div>
    <nav className="detail-edge-nav" aria-label="Artwork arrows">
      {previous
        ? <Link to={detailPath(previous)} aria-label={`Previous artwork: ${previous.title || 'Untitled'}`}>←</Link>
        : <span aria-hidden="true">←</span>}
      {next
        ? <Link to={detailPath(next)} aria-label={`Next artwork: ${next.title || 'Untitled'}`}>→</Link>
        : <span aria-hidden="true">→</span>}
    </nav>

    {artworkStatus === 'error'
      ? <StatusPanel title="Artwork could not be loaded" message="Check your connection and try again." action="Try again" onAction={() => { setArtworkStatus('loading'); setRetryIndex((value) => value + 1) }} />
      : artworkStatus === 'loading' || !artwork || artwork.id !== artworkId
        ? <StatusPanel title="Opening artwork" message="Preparing the details…" loading />
        : <div className="detail-layout">
          <div className="detail-art-side">
            <div className="detail-image-panel">
              <ArtworkImage key={`${artwork.id}-${artwork.image_id}`} artwork={artwork} size={843} eager />
            </div>
            <span className="detail-image-note">ART INSTITUTE OF CHICAGO COLLECTION</span>
          </div>
          <article className="detail-info">
            <p className="eyebrow">ARTWORK INFORMATION <span aria-hidden="true">/</span> {artwork.artwork_type_title || 'ARTWORK'}</p>
            <h1>{artwork.title || 'Untitled'}</h1>
            <div className="detail-artist">{artwork.artist_title || 'Artist unknown'}</div>
            <div className="detail-facts">
              <div><span>TYPE</span><strong>{artwork.artwork_type_title || 'Not recorded'}</strong></div>
              <div><span>ARTIST</span><strong>{artwork.artist_display || artwork.artist_title || 'Not recorded'}</strong></div>
              <div><span>DATE</span><strong>{artwork.date_display || 'Not recorded'}</strong></div>
            </div>
            <section className="detail-description">
              <h2>About this work</h2>
              <p>{description || 'No curatorial description is available for this artwork.'}</p>
            </section>
            {(artwork.medium_display || artwork.dimensions || artwork.place_of_origin) && <div className="detail-extra">
              {artwork.medium_display && <div><span>MEDIUM</span><p>{artwork.medium_display}</p></div>}
              {artwork.dimensions && <div><span>DIMENSIONS</span><p>{artwork.dimensions}</p></div>}
              {artwork.place_of_origin && <div><span>ORIGIN</span><p>{artwork.place_of_origin}</p></div>}
            </div>}
          </article>
        </div>}

    <div className="detail-pagination" aria-label="Artwork navigation">
      {previous ? <Link className="detail-pager" to={detailPath(previous)} aria-label={`Previous artwork: ${previous.title || 'Untitled'}`}><span className="pager-arrow" aria-hidden="true">←</span><span><small>PREVIOUS WORK</small><strong>{previous.title || 'Untitled'}</strong></span></Link> : <span className="detail-pager disabled"><span className="pager-arrow" aria-hidden="true">←</span><span><small>PREVIOUS WORK</small><strong>{sequenceStatus === 'loading' ? 'Loading…' : 'Beginning of collection'}</strong></span></span>}
      {next ? <Link className="detail-pager next" to={detailPath(next)} aria-label={`Next artwork: ${next.title || 'Untitled'}`}><span><small>NEXT WORK</small><strong>{next.title || 'Untitled'}</strong></span><span className="pager-arrow" aria-hidden="true">→</span></Link> : <span className="detail-pager next disabled"><span><small>NEXT WORK</small><strong>{sequenceStatus === 'loading' ? 'Loading…' : 'End of collection'}</strong></span><span className="pager-arrow" aria-hidden="true">→</span></span>}
    </div>
    {sequenceStatus === 'error' && <p className="sequence-error" role="status">Artwork navigation is unavailable right now. <button type="button" onClick={() => setRetryIndex((value) => value + 1)}>Retry</button></p>}
  </div>
}
