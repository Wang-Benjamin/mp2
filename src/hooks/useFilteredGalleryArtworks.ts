import { useEffect, useState } from 'react'
import { getFilteredGalleryArtworks, type Artwork, type GalleryFilters } from '../lib/artworks'

interface Result {
  key: string
  items: Artwork[]
  hasMore: boolean
  count: number
}

export function useFilteredGalleryArtworks(filters: GalleryFilters, count: number, active: boolean) {
  const { type, artist, period, department } = filters
  const key = JSON.stringify([type, artist, period, department])
  const [result, setResult] = useState<Result | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active) return
    let mounted = true
    const requestKey = `${key}|${count}`
    getFilteredGalleryArtworks({ type, artist, period, department }, count).then(
      (page) => {
        if (!mounted) return
        setResult({ ...page, key, count })
        setErrorKey(null)
      },
      () => { if (mounted) setErrorKey(requestKey) },
    )
    return () => { mounted = false }
  }, [active, type, artist, period, department, key, count, attempt])

  const current = result?.key === key ? result : null
  const error = errorKey === `${key}|${count}`
  return {
    items: current?.items ?? [],
    status: (current ? 'ready' : error ? 'error' : 'loading') as 'ready' | 'error' | 'loading',
    hasMore: current?.hasMore ?? true,
    loadingMore: Boolean(current && current.count < count && current.hasMore && !error),
    loadMoreError: Boolean(current && error),
    retry: () => { setErrorKey(null); setAttempt((value) => value + 1) },
  }
}
