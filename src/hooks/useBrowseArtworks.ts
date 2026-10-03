import { useEffect, useRef, useState } from 'react'
import { getBrowseArtworks, type Artwork } from '../lib/artworks'

export function useBrowseArtworks(count: number) {
  const [items, setItems] = useState<Artwork[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [hasMore, setHasMore] = useState(true)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const loadedCount = useRef(0)

  useEffect(() => {
    let active = true
    getBrowseArtworks(count).then(
      (result) => {
        if (!active) return
        loadedCount.current = result.items.length
        setItems(result.items)
        setHasMore(result.hasMore)
        setStatus('ready')
        setLoadMoreError(false)
      },
      () => {
        if (!active) return
        if (loadedCount.current) setLoadMoreError(true)
        else setStatus('error')
      },
    )
    return () => { active = false }
  }, [count, attempt])

  return {
    items,
    status,
    hasMore,
    loadingMore: status === 'ready' && items.length < count && hasMore && !loadMoreError,
    loadMoreError,
    retry: () => {
      setLoadMoreError(false)
      if (!items.length) setStatus('loading')
      setAttempt((value) => value + 1)
    },
  }
}
